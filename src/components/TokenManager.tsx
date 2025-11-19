"use client";

import { useState } from "react";
import { Button, Flex, Input, Spinner, Text } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useAzureStore } from "@/stores/azureStore";
import { useVerifyAzureAuth } from "@/services/azureQueries";

interface BaseTokenManagerProps {
  isLoading?: boolean;
  userName?: string;
}

interface JiraTokenManagerProps extends BaseTokenManagerProps {
  type: "jira";
  isConnected: boolean;
  onSave: (token: string) => Promise<boolean>;
  onClear: () => void;
}

interface AzureTokenManagerProps extends BaseTokenManagerProps {
  type: "azure";
  // Azure props are handled internally by the component
}

type TokenManagerProps = JiraTokenManagerProps | AzureTokenManagerProps;

export default function TokenManager(props: TokenManagerProps) {
  const { type } = props;

  // Azure store (only used for Azure type)
  const azureStore = useAzureStore();
  const verifyAzureMutation = useVerifyAzureAuth();

  const [token, setToken] = useState("");
  const [userOrg, setUserOrg] = useState("");
  const [showInput, setShowInput] = useState(false);

  const displayName = type === "jira" ? "Jira" : "Azure DevOps";

  // For Azure: use store values, for Jira: use props
  const isConnected =
    type === "azure"
      ? azureStore.hasHydrated && azureStore.isAuthValid()
      : props.isConnected;
  const isLoading =
    type === "azure" ? verifyAzureMutation.isPending : props.isLoading || false;

  // Use stored org or user input
  const org = type === "azure" ? userOrg || azureStore.org || "" : "";

  const handleSave = async () => {
    if (type === "azure") {
      if (!token.trim() || !org.trim()) {
        toaster.error({
          title: "Missing Information",
          description: "Please enter both Organization and PAT",
        });

        return;
      }

      try {
        // Save credentials first (needed for the mutation to work)
        azureStore.setCredentials(token.trim(), org.trim());

        // Verify connection via backend
        await verifyAzureMutation.mutateAsync({
          organization: org.trim(),
          pat: token.trim(),
        });

        // Set verification timestamp on success
        azureStore.setLastVerified(new Date());

        toaster.success({
          title: "Authorization successful",
          description: "Successfully connected to Azure DevOps",
        });

        setToken("");
        setUserOrg("");
        setShowInput(false);
      } catch (error) {
        // Clear credentials on failure
        azureStore.clearAuth();

        toaster.error({
          title: "Connection Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to connect to Azure DevOps",
        });
      }
    } else {
      // Jira flow (unchanged)
      if (token.trim()) {
        const success = await props.onSave(token.trim());

        if (success) {
          setToken("");
          setShowInput(false);
          toaster.success({
            title: "Connected",
            description: `Successfully connected to ${displayName}`,
          });
        }
      }
    }
  };

  const handleClear = () => {
    if (type === "azure") {
      azureStore.clearAuth();
      toaster.info({
        title: "Disconnected",
        description: "Successfully disconnected from Azure DevOps",
      });
    } else {
      props.onClear();
      toaster.info({
        title: "Disconnected",
        description: `Successfully disconnected from ${displayName}`,
      });
    }
    setToken("");
    setUserOrg("");
    setShowInput(false);
  };

  const handleToggle = () => {
    setShowInput(!showInput);
  };

  return (
    <Flex align="center" gap={4}>
      {!isConnected ? (
        <>
          {/* Connect Button */}
          <Button
            colorPalette="whiteAlpha"
            variant="outline"
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              <Flex align="center" gap={2}>
                <Spinner size="sm" />
                Checking...
              </Flex>
            ) : (
              `🔐 Connect ${displayName}`
            )}
          </Button>

          {/* Token Input */}
          {showInput && (
            <Flex
              align="center"
              gap={2}
              bg="rgba(255,255,255,0.9)"
              p={3}
              borderRadius="md"
            >
              {type === "azure" && (
                <Input
                  placeholder="Organization"
                  value={org}
                  onChange={(e) => setUserOrg(e.target.value)}
                  size="sm"
                  width="150px"
                />
              )}
              <Input
                placeholder="Personal Access Token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isLoading && handleSave()
                }
                size="sm"
                width="250px"
              />
              <Button
                colorPalette="green"
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? <Spinner size="sm" /> : "Save"}
              </Button>
            </Flex>
          )}
        </>
      ) : (
        <>
          {/* Connected Status */}
          <Flex
            align="center"
            gap={3}
            bg="rgba(255,255,255,0.9)"
            p={3}
            borderRadius="md"
          >
            <Text fontSize="sm" fontWeight="medium" color="green.700">
              🔗 Connected to {displayName}
            </Text>
            {type === "azure" && azureStore.org && (
              <Text fontSize="sm" color="gray.600">
                Org: <strong>{azureStore.org}</strong>
              </Text>
            )}
            {type === "azure" &&
              azureStore.getDaysSinceVerification() !== null && (
                <Text fontSize="xs" color="gray.500">
                  (Verified {azureStore.getDaysSinceVerification()} days ago)
                </Text>
              )}
            {type === "jira" && props.userName && (
              <Text fontSize="sm" color="gray.600">
                Welcome, <strong>{props.userName}</strong>!
              </Text>
            )}
            <Button
              colorPalette="red"
              variant="outline"
              onClick={handleClear}
              size="sm"
            >
              Disconnect
            </Button>
          </Flex>
        </>
      )}
    </Flex>
  );
}
