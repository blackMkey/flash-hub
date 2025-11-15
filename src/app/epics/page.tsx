"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  Menu,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAuthStore, useDataStore } from "@/stores";
import { useEpic } from "@/services/jiraQueries";
import { useExcelExport } from "@/services/useExcelExport";
import Link from "next/link";

export default function EpicsPage() {
  // Local UI state
  const [inputToken, setInputToken] = useState("");

  // Auth store
  const {
    isConnected,
    isLoading: authLoading,
    error: authError,
    user,
    saveToken,
    clearAuth,
    checkExistingAuth,
  } = useAuthStore();

  // Data store
  const {
    currentEpic,
    currentEpicKey,
    searchHistory,
    setCurrentEpicKey,
    setCurrentEpic,
    setEpicError,
    addToSearchHistory,
    clearCurrentEpic,
  } = useDataStore();

  // React Query for epic fetching
  const {
    data: fetchedEpic,
    isLoading: isLoadingEpic,
    error: epicQueryError,
    refetch: refetchEpic,
  } = useEpic(currentEpicKey.trim() || null);

  // Combined loading state
  const isLoading = authLoading || isLoadingEpic;
  const error =
    authError ||
    (epicQueryError instanceof Error ? epicQueryError.message : null);

  // Excel export functionality
  const { isExporting, exportError, exportEpicToExcel } = useExcelExport();

  // Derived state - show token input if not connected
  const showTokenInput = !isConnected;

  useEffect(() => {
    // Check existing authentication on page load
    checkExistingAuth();
  }, [checkExistingAuth]);

  // Sync fetched epic with dataStore
  useEffect(() => {
    if (fetchedEpic) {
      setCurrentEpic(fetchedEpic);
      setEpicError(null);
      // Add to search history
      addToSearchHistory(currentEpicKey.trim(), fetchedEpic.summary);
    } else if (epicQueryError) {
      setCurrentEpic(null);
      const errorMessage =
        epicQueryError instanceof Error
          ? epicQueryError.message
          : "Failed to fetch epic";

      setEpicError(errorMessage);
    }
  }, [
    fetchedEpic,
    epicQueryError,
    setCurrentEpic,
    setEpicError,
    addToSearchHistory,
    currentEpicKey,
  ]);

  const handleSaveToken = async () => {
    if (inputToken.trim()) {
      try {
        await saveToken(inputToken.trim());
        setInputToken("");
      } catch (err) {
        // Error is handled by the store
        console.error("Failed to save token:", err);
      }
    }
  };

  const handleClearToken = () => {
    clearAuth();
    clearCurrentEpic();
    setInputToken("");
  };

  const handleFetchEpic = async () => {
    if (!currentEpicKey.trim()) {
      return;
    }

    if (!isConnected) {
      return;
    }

    try {
      // Clear any previous errors
      setEpicError(null);
      // Trigger React Query refetch
      await refetchEpic();
    } catch (err) {
      // Error is handled by React Query and useEffect
      console.error("Failed to fetch epic:", err);
    }
  };

  const handleHistorySelect = (epicKey: string) => {
    setCurrentEpicKey(epicKey);
  };

  return (
    <>
      {/* Token Input Section */}
      {showTokenInput && (
        <Box
          mb={6}
          p={6}
          bg="rgba(255,255,255,0.95)"
          borderRadius="lg"
          backdropFilter="blur(10px)"
        >
          <Stack gap={4}>
            <Heading size="md">Jira Personal Access Token</Heading>
            <Text fontSize="sm" color="gray.600">
              Enter your Jira Personal Access Token to connect to:
              <strong> https://insight.fsoft.com.vn/jira9</strong>
            </Text>

            <Flex gap={4}>
              <Input
                placeholder="Enter your Personal Access Token..."
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isLoading && handleSaveToken()
                }
              />
              <Button
                colorPalette="green"
                onClick={handleSaveToken}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="sm" /> : "Save Token"}
              </Button>
              {isConnected && (
                <Button
                  colorPalette="red"
                  variant="outline"
                  onClick={handleClearToken}
                >
                  Clear
                </Button>
              )}
            </Flex>

            {isConnected && user && (
              <Box
                p={4}
                bg="green.50"
                borderRadius="md"
                border="1px solid"
                borderColor="green.200"
              >
                <Text color="green.800">
                  ✅ Connected as <strong>{user.displayName}</strong> (
                  {user.emailAddress})
                </Text>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <Box
          p={4}
          bg="orange.50"
          borderRadius="md"
          border="1px solid"
          borderColor="orange.200"
          mb={6}
        >
          <Text color="orange.800">
            ⚠️ Please connect your Jira account using a Personal Access Token to
            access epic data.
          </Text>
        </Box>
      )}

      {/* Epic Search Section */}
      {isConnected && (
        <Box
          p={6}
          bg="rgba(255,255,255,0.95)"
          borderRadius="lg"
          backdropFilter="blur(10px)"
          mb={6}
        >
          <Stack gap={4}>
            <Heading size="md">🔍 Search Epic by Key</Heading>
            <Text fontSize="sm" color="gray.600">
              Enter an epic key (e.g., FHMPSATIB2JA-1840) to fetch detailed
              information
            </Text>

            <Flex gap={4}>
              <Input
                placeholder="Enter epic key (e.g., FHMPSATIB2JA-1840)"
                value={currentEpicKey}
                onChange={(e) => setCurrentEpicKey(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleFetchEpic()}
                disabled={isLoading}
              />
              <Button
                colorPalette="blue"
                onClick={handleFetchEpic}
                disabled={isLoading || !currentEpicKey.trim()}
              >
                {isLoading ? <Spinner size="sm" /> : "Fetch Epic"}
              </Button>
              <Link href="/epics/addSubTaskByTemplate?mode=multiepic">
                <Button colorPalette="purple" variant="outline" size="md">
                  🌟 Create Multi-Epic Subtasks
                </Button>
              </Link>
            </Flex>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Recent Searches:
                </Text>
                <Flex gap={2} wrap="wrap">
                  {searchHistory.slice(0, 5).map((item) => (
                    <Button
                      key={item.epicKey}
                      size="sm"
                      variant="outline"
                      colorPalette="gray"
                      onClick={() => handleHistorySelect(item.epicKey)}
                    >
                      {item.epicKey}
                    </Button>
                  ))}
                </Flex>
              </Box>
            )}

            {error && (
              <Box
                p={4}
                bg="red.50"
                borderRadius="md"
                border="1px solid"
                borderColor="red.200"
              >
                <Text color="red.800">❌ {error}</Text>
              </Box>
            )}

            {/* Excel Export Error */}
            {exportError && (
              <Box
                p={4}
                bg="red.50"
                borderRadius="md"
                border="1px solid"
                borderColor="red.200"
                mb={4}
              >
                <Text color="red.800">
                  ❌ Excel Export Error: {exportError}
                </Text>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Fetched Epic Details */}
      {currentEpic && (
        <Box
          p={6}
          bg="rgba(255,255,255,0.95)"
          borderRadius="lg"
          backdropFilter="blur(10px)"
          mb={6}
        >
          <Stack gap={6}>
            <Heading size="md">📋 Epic Details</Heading>

            {/* Epic Information */}
            <Box p={4} bg="gray.50" borderRadius="md">
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                gap={4}
              >
                <Box>
                  <Text fontWeight="bold" color="gray.600">
                    Key:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {currentEpic.key}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600">
                    Status:
                  </Text>
                  <Badge colorPalette="blue">{currentEpic.status.name}</Badge>
                </Box>
                <Box gridColumn={{ base: "1", md: "1 / -1" }}>
                  <Text fontWeight="bold" color="gray.600">
                    Summary:
                  </Text>
                  <Text fontSize="lg">{currentEpic.summary}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600">
                    Priority:
                  </Text>
                  <Badge colorPalette="orange">
                    {currentEpic.priority.name}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600">
                    Story Points:
                  </Text>
                  <Text fontWeight="bold">
                    {currentEpic.storyPoints || "Not set"}
                  </Text>
                </Box>
                {currentEpic.assignee && (
                  <Box>
                    <Text fontWeight="bold" color="gray.600">
                      Assignee:
                    </Text>
                    <Text>{currentEpic.assignee.displayName}</Text>
                  </Box>
                )}
                <Box>
                  <Text fontWeight="bold" color="gray.600">
                    Created:
                  </Text>
                  <Text>
                    {new Date(currentEpic.created).toLocaleDateString()}
                  </Text>
                </Box>
              </Grid>
            </Box>

            {/* Subtasks Table */}
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm">
                  🎯 Subtasks ({currentEpic.subtasks.length})
                </Heading>
                {isConnected && (
                  <Flex gap={3}>
                    <Button
                      colorPalette="green"
                      size="sm"
                      variant="outline"
                      onClick={() => exportEpicToExcel(currentEpic)}
                      disabled={isExporting}
                    >
                      📊 Export to Excel
                    </Button>
                    <Menu.Root>
                      <Menu.Trigger asChild>
                        <Button colorPalette="green" size="sm">
                          + Create Subtask ▼
                        </Button>
                      </Menu.Trigger>
                      <Menu.Positioner>
                        <Menu.Content>
                          <Menu.Item value="single" asChild>
                            <Link
                              href={`/epics/addSubTask?parentKey=${currentEpic.project.key}&epicKey=${currentEpic.key}`}
                            >
                              <Box
                                as="span"
                                display="flex"
                                alignItems="center"
                                gap={2}
                                width="100%"
                              >
                                ➕ Create Single Subtask
                              </Box>
                            </Link>
                          </Menu.Item>
                          <Menu.Item value="template" asChild>
                            <Link
                              href={`/epics/addSubTaskByTemplate?parentKey=${currentEpic.project.key}&epicKey=${currentEpic.key}`}
                            >
                              <Box
                                as="span"
                                display="flex"
                                alignItems="center"
                                gap={2}
                                width="100%"
                              >
                                📋 Create by Template
                              </Box>
                            </Link>
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Menu.Root>
                  </Flex>
                )}
              </Flex>
              {currentEpic.subtasks.length > 0 ? (
                <Box overflowX="auto">
                  <Table.Root variant="outline">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Key</Table.ColumnHeader>
                        <Table.ColumnHeader>Summary</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {currentEpic.subtasks.map((subtask) => (
                        <Table.Row key={subtask.id}>
                          <Table.Cell fontWeight="medium">
                            {subtask.key}
                          </Table.Cell>
                          <Table.Cell>{subtask.summary}</Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette="green">
                              {subtask.status.name}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              ) : (
                <Box p={4} bg="gray.50" borderRadius="md" textAlign="center">
                  <Text color="gray.600">No subtasks found for this epic</Text>
                </Box>
              )}
            </Box>
          </Stack>
        </Box>
      )}

      {/* Flash Footer */}
      <Box textAlign="center" mt={12}>
        <Text color="rgba(0, 0, 0, 0.8)" fontSize="sm">
          Flash is watching over your epics... slowly but surely! 🦥
        </Text>
      </Box>
    </>
  );
}
