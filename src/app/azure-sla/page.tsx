"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useAzureAuthStore, useDataStore } from "@/stores";

interface Comment {
  text: string;
  createdDate: string;
  createdBy: string;
}

interface WorkItem {
  id: string;
  title: string;
  state: string;
  areaPath: string;
  createdDate: string;
  priority: number;
  comments: Comment[];
  workaroundDueDate: string;
  solutionDueDate: string;
  hasWorkaround?: boolean;
  hasSolution?: boolean;
}

export default function AzureSLAPage() {
  // Azure Auth Store
  const { checkExistingAuth, clearAuth } = useAzureAuthStore();

  // Data Store
  const {
    azureProject: storedProject,
    azureAreaPath: storedAreaPath,
    setAzureProject,
    setAzureAreaPath,
  } = useDataStore();

  // Configuration state - use user input or fall back to stored values
  const [userProject, setUserProject] = useState("");
  const [userAreaPath, setUserAreaPath] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Derived values that prefer user input over stored values
  const project = userProject || storedProject || "";
  const areaPath = userAreaPath || storedAreaPath || "";

  // Check existing auth on mount
  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  // Data state
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }

      return newSet;
    });
  };

  const handleFetchWorkItems = async () => {
    if (!project || !areaPath || !startDate || !endDate) {
      setError("All fields are required");

      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/azure/work-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          project,
          areaPath,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.error.includes("authentication")) {
          clearAuth();
        }
        throw new Error(errorData.error || "Failed to fetch work items");
      }

      const data = await response.json();

      setAzureAreaPath(areaPath.trim());
      setAzureProject(project.trim());
      setWorkItems(data.workItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={8}>
      <Stack gap={6}>
        <Heading size="2xl" color="gray.700">
          Azure SLA Tracker
        </Heading>

        {/* Configuration Form */}
        <Box
          bg="white"
          p={6}
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.200"
          shadow="sm"
        >
          <Stack gap={4}>
            <Heading size="md" color="gray.700">
              Azure DevOps Configuration
            </Heading>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <Box gridColumn={{ base: "1", md: "1 / -1" }}>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
                  Project
                </Text>
                <Input
                  value={project}
                  onChange={(e) => setUserProject(e.target.value)}
                  placeholder="e.g., Ascott Brand Websites"
                  size="lg"
                />
              </Box>

              <Box gridColumn={{ base: "1", md: "1 / -1" }}>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
                  Area Path
                </Text>
                <Input
                  value={areaPath}
                  onChange={(e) => setUserAreaPath(e.target.value)}
                  placeholder="e.g., Ascott Brand Websites\\AMS Team"
                  size="lg"
                />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
                  Start Date
                </Text>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size="lg"
                />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
                  End Date
                </Text>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  size="lg"
                />
              </Box>
            </Grid>

            {/* Quick Date Range Buttons */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
                Quick Date Range:
              </Text>
              <Flex gap={2} wrap="wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today);

                    yesterday.setDate(yesterday.getDate() - 1);
                    setStartDate(yesterday.toISOString().split("T")[0]);
                    setEndDate(today.toISOString().split("T")[0]);
                  }}
                >
                  1 Day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);

                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setStartDate(weekAgo.toISOString().split("T")[0]);
                    setEndDate(today.toISOString().split("T")[0]);
                  }}
                >
                  1 Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);

                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    setStartDate(monthAgo.toISOString().split("T")[0]);
                    setEndDate(today.toISOString().split("T")[0]);
                  }}
                >
                  1 Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, "0");
                    const firstDay = `${year}-${month}-01`;

                    setStartDate(firstDay);
                    setEndDate(today.toISOString().split("T")[0]);
                  }}
                >
                  Current Month
                </Button>
              </Flex>
            </Box>

            <Flex justify="flex-end" gap={3}>
              <Button
                onClick={handleFetchWorkItems}
                loading={isLoading}
                loadingText="Fetching..."
                colorPalette="blue"
                size="lg"
              >
                Fetch Work Items
              </Button>
            </Flex>
          </Stack>
        </Box>

        {/* Error Display */}
        {error && (
          <Box
            bg="red.50"
            border="1px solid"
            borderColor="red.200"
            borderRadius="lg"
            p={4}
          >
            <Text color="red.700" fontWeight="medium">
              {error}
            </Text>
          </Box>
        )}

        {/* Work Items Table */}
        {workItems.length > 0 && (
          <Box
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            shadow="sm"
            overflow="hidden"
          >
            <Box overflowX="auto">
              <Table.Root size="lg" variant="line">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    <Table.ColumnHeader fontWeight="bold">
                      ID
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Title
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      State
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Priority
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Created Date
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Workaround Due
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Solution Due
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Status
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {workItems.map((item) => {
                    const isExpanded = expandedItems.has(item.id);

                    return (
                      <React.Fragment key={item.id}>
                        <Table.Row
                          onClick={() => toggleExpand(item.id)}
                          cursor="pointer"
                          _hover={{ bg: "gray.50" }}
                        >
                          <Table.Cell>
                            <Flex align="center" gap={2}>
                              <Text fontSize="lg">
                                {isExpanded ? "▼" : "▶"}
                              </Text>
                              <Badge colorPalette="blue">{item.id}</Badge>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell maxW="300px" truncate title={item.title}>
                            {item.title}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              colorPalette={
                                item.state === "Active"
                                  ? "green"
                                  : item.state === "Resolved"
                                  ? "blue"
                                  : "gray"
                              }
                            >
                              {item.state}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              colorPalette={
                                item.priority === 1
                                  ? "red"
                                  : item.priority === 2
                                  ? "orange"
                                  : item.priority === 3
                                  ? "yellow"
                                  : "gray"
                              }
                            >
                              P{item.priority}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell fontSize="sm" color="gray.600">
                            {new Date(item.createdDate).toLocaleDateString()}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="sm"
                            color="gray.600"
                            bg={
                              new Date() > new Date(item.workaroundDueDate) &&
                              !item.hasWorkaround
                                ? "red.100"
                                : undefined
                            }
                            fontWeight={
                              new Date() > new Date(item.workaroundDueDate) &&
                              !item.hasWorkaround
                                ? "bold"
                                : undefined
                            }
                          >
                            {new Date(
                              item.workaroundDueDate
                            ).toLocaleDateString()}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="sm"
                            color="gray.600"
                            bg={
                              new Date() > new Date(item.solutionDueDate) &&
                              !item.hasSolution
                                ? "red.100"
                                : undefined
                            }
                            fontWeight={
                              new Date() > new Date(item.solutionDueDate) &&
                              !item.hasSolution
                                ? "bold"
                                : undefined
                            }
                          >
                            {new Date(
                              item.solutionDueDate
                            ).toLocaleDateString()}
                          </Table.Cell>
                          <Table.Cell>
                            <Flex gap={1}>
                              {item.hasWorkaround && (
                                <Badge colorPalette="green" size="sm">
                                  ✓ WA
                                </Badge>
                              )}
                              {item.hasSolution && (
                                <Badge colorPalette="blue" size="sm">
                                  ✓ SOL
                                </Badge>
                              )}
                              {!item.hasWorkaround && !item.hasSolution && (
                                <Badge colorPalette="gray" size="sm">
                                  Pending
                                </Badge>
                              )}
                            </Flex>
                          </Table.Cell>
                        </Table.Row>

                        {isExpanded && (
                          <Table.Row key={`${item.id}-comments`}>
                            <Table.Cell colSpan={8} bg="gray.50" p={4}>
                              <Box>
                                <Heading size="sm" mb={3} color="gray.700">
                                  Comments ({item.comments.length})
                                </Heading>
                                {item.comments.length === 0 ? (
                                  <Text color="gray.500" fontSize="sm">
                                    No comments available
                                  </Text>
                                ) : (
                                  <Stack gap={3}>
                                    {item.comments.map((comment, idx) => (
                                      <Box
                                        key={idx}
                                        bg="white"
                                        p={3}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="gray.200"
                                      >
                                        <Flex
                                          justify="space-between"
                                          mb={2}
                                          gap={2}
                                        >
                                          <Text
                                            fontSize="xs"
                                            fontWeight="bold"
                                            color="blue.600"
                                          >
                                            {comment.createdBy}
                                          </Text>
                                          <Text fontSize="xs" color="gray.500">
                                            {new Date(
                                              comment.createdDate
                                            ).toLocaleString()}
                                          </Text>
                                        </Flex>
                                        <Text
                                          fontSize="sm"
                                          color="gray.700"
                                          whiteSpace="pre-wrap"
                                          wordBreak="break-word"
                                          dangerouslySetInnerHTML={{
                                            __html: comment.text,
                                          }}
                                        />
                                      </Box>
                                    ))}
                                  </Stack>
                                )}
                              </Box>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && (
          <Flex justify="center" align="center" py={12}>
            <Spinner size="xl" color="blue.500" />
          </Flex>
        )}

        {/* Empty State */}
        {!isLoading && workItems.length === 0 && !error && (
          <Box
            bg="gray.50"
            border="1px dashed"
            borderColor="gray.300"
            borderRadius="lg"
            p={12}
            textAlign="center"
          >
            <Text fontSize="lg" color="gray.500">
              Enter your Azure DevOps configuration and click &quot;Fetch Work
              Items&quot; to get started
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
