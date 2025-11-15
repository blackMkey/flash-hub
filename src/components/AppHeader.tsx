"use client";

import { useState } from "react";
import {
  Heading,
  Button,
  Flex,
  Text,
  Input,
  Spinner,
  Box,
} from "@chakra-ui/react";
import Link from "next/link";
import { useAuthStore } from "@/stores";

interface AppHeaderProps {
  pageTitle: string;
}

export default function AppHeader({ pageTitle }: AppHeaderProps) {
  // Local UI state for token input
  const [inputToken, setInputToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Auth store
  const {
    isConnected,
    isLoading: authLoading,
    error: authError,
    user,
    saveToken,
    clearAuth,
  } = useAuthStore();

  const handleSaveToken = async () => {
    if (inputToken.trim()) {
      try {
        await saveToken(inputToken.trim());
        setInputToken("");
        setShowTokenInput(false);
      } catch (err) {
        console.error("Failed to save token:", err);
      }
    }
  };

  const handleClearToken = () => {
    clearAuth();
    setInputToken("");
    setShowTokenInput(false);
  };

  const handleToggleTokenInput = () => {
    setShowTokenInput(!showTokenInput);
  };

  return (
    <>
      <Flex justify="space-between" align="center" mb={8}>
        <Link href="/">
          <Button variant="outline" colorPalette="whiteAlpha">
            ← Back to Home
          </Button>
        </Link>
        <Heading textAlign="center">{pageTitle}</Heading>

        {/* Token Management Section */}
        <Flex align="center" gap={4}>
          {/* Connection Status Button */}
          <Button
            colorPalette="whiteAlpha"
            variant={isConnected ? "solid" : "outline"}
            onClick={handleToggleTokenInput}
            disabled={authLoading}
          >
            {authLoading ? (
              <Flex align="center" gap={2}>
                <Spinner size="sm" />
                Checking...
              </Flex>
            ) : isConnected ? (
              <>
                🔗 Connected
                {user?.displayName ? ` (${user.displayName})` : ""}
              </>
            ) : (
              "🔐 Connect Jira"
            )}
          </Button>

          {/* Token Input (when expanded) */}
          {showTokenInput && (
            <Flex
              align="center"
              gap={2}
              bg="rgba(255,255,255,0.9)"
              p={3}
              borderRadius="md"
            >
              <Input
                placeholder="Personal Access Token"
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !authLoading && handleSaveToken()
                }
                size="sm"
                width="250px"
              />
              <Button
                colorPalette="green"
                onClick={handleSaveToken}
                disabled={authLoading}
                size="sm"
              >
                {authLoading ? <Spinner size="sm" /> : "Save"}
              </Button>
              {isConnected && (
                <Button
                  colorPalette="red"
                  variant="outline"
                  onClick={handleClearToken}
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* Error Display */}
      {authError && (
        <Box
          p={4}
          bg="red.50"
          borderRadius="md"
          border="1px solid"
          borderColor="red.200"
          mb={6}
        >
          <Text color="red.800">❌ {authError}</Text>
        </Box>
      )}

      {/* Loading Existing Token Display */}
      {authLoading && (
        <Box
          p={4}
          bg="blue.50"
          borderRadius="md"
          border="1px solid"
          borderColor="blue.200"
          mb={6}
        >
          <Flex align="center" gap={3}>
            <Spinner size="sm" colorPalette="blue" />
            <Text color="blue.800">🔍 Checking for existing session...</Text>
          </Flex>
        </Box>
      )}

      {/* Success Display */}
      {isConnected && user && showTokenInput && (
        <Box
          p={4}
          bg="green.50"
          borderRadius="md"
          border="1px solid"
          borderColor="green.200"
          mb={6}
        >
          <Text color="green.800">
            ✅ Connected as <strong>{user.displayName}</strong> (
            {user.emailAddress})
          </Text>
        </Box>
      )}
    </>
  );
}
