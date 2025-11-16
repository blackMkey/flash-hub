"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Flex, Input, Spinner, Text } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useDataStore } from "@/stores";

interface BaseTokenManagerProps {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  userName?: string;
  onClear: () => void;
}

interface JiraTokenManagerProps extends BaseTokenManagerProps {
  type: "jira";
  onSave: (token: string) => Promise<boolean>;
}

interface AzureTokenManagerProps extends BaseTokenManagerProps {
  type: "azure";
  onSave: (token: string, org: string) => Promise<boolean>;
}

type TokenManagerProps = JiraTokenManagerProps | AzureTokenManagerProps;

export default function TokenManager({
  type,
  isConnected,
  isLoading,
  error,
  userName,
  onSave,
  onClear,
}: TokenManagerProps) {
  const { azureOrg: storedOrg, setAzureOrg } = useDataStore();
  const [token, setToken] = useState("");
  const [userOrg, setUserOrg] = useState("");
  const [showInput, setShowInput] = useState(false);
  const lastErrorRef = useRef<string | null>(null);

  const displayName = type === "jira" ? "Jira" : "Azure DevOps";

  // Use storedOrg if user hasn't entered a value yet
  const org = userOrg || storedOrg || "";

  // Show error toast when error changes (scheduled to avoid render conflicts)
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      setTimeout(() => {
        toaster.error({
          title: "Connection Error",
          description: error,
        });
      }, 0);
      lastErrorRef.current = error;
    } else if (!error) {
      lastErrorRef.current = null;
    }
  }, [error]);

  const handleSave = async () => {
    if (type === "azure") {
      if (!!token.trim() && !!org.trim()) {
        const success = await onSave(token.trim(), org.trim());

        if (success) {
          setAzureOrg(org.trim());
          setToken("");
          setUserOrg(""); // Clear user input
          setShowInput(false);
          toaster.success({
            title: "Connected",
            description: `Successfully connected to ${displayName}`,
          });
        }
      }
    } else {
      if (token.trim()) {
        const success = await onSave(token.trim());

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
    onClear();
    setToken("");
    setUserOrg(""); // Clear user input
    setShowInput(false);
    toaster.info({
      title: "Disconnected",
      description: `Disconnected from ${displayName}`,
    });
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
            {userName && (
              <Text fontSize="sm" color="gray.600">
                Welcome, <strong>{userName}</strong>!
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
