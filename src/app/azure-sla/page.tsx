"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  InputGroup,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useAzureAuthStore, useDataStore } from "@/stores";
import {
  type AzureWorkItem,
  type FetchWorkItemsParams,
  useAzureWorkItems,
} from "@/services/azureQueries";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

  // Query parameters state
  const [queryParams, setQueryParams] = useState<FetchWorkItemsParams | null>(
    null
  );

  // Fetch work items using React Query
  const {
    data: workItemsData,
    isLoading,
    error: queryError,
  } = useAzureWorkItems(queryParams, !!queryParams);

  const workItems = React.useMemo(
    () => workItemsData?.workItems || [],
    [workItemsData]
  );
  const error = queryError ? (queryError as Error).message : null;

  // UI state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Teams notification state
  const [selectedOverdueItems, setSelectedOverdueItems] = useState<Set<string>>(
    new Set()
  );
  const [teamsMessage, setTeamsMessage] = useState("");
  const [isSendingToTeams, setIsSendingToTeams] = useState(false);

  // Sort and filter state
  const [sortField, setSortField] = useState<keyof AzureWorkItem | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterText, setFilterText] = useState("");
  const [debouncedFilterText, setDebouncedFilterText] = useState("");

  // Configuration error state
  const [configError, setConfigError] = useState<string | null>(null);

  // Debounce filter text with 500ms delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilterText(filterText);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filterText]);

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

  // Sort handler
  const handleSort = (field: keyof AzureWorkItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFetchWorkItems = () => {
    // Validate all required fields
    const missingFields = [];

    if (!project) missingFields.push("Project");
    if (!areaPath) missingFields.push("Area Path");
    if (!startDate) missingFields.push("Start Date");
    if (!endDate) missingFields.push("End Date");

    if (missingFields.length > 0) {
      setConfigError(
        `Please fill in the following required fields: ${missingFields.join(
          ", "
        )}`
      );

      return;
    }

    // Clear any previous config errors
    setConfigError(null);

    // Save to data store
    setAzureAreaPath(areaPath.trim());
    setAzureProject(project.trim());

    // Trigger query by setting params
    setQueryParams({
      project: project.trim(),
      areaPath: areaPath.trim(),
      startDate,
      endDate,
    });
  };

  // Handle auth errors from query
  useEffect(() => {
    if (error && error.includes("authentication")) {
      clearAuth();
    }
  }, [error, clearAuth]);

  // Filter and sort work items
  const filteredAndSortedWorkItems = React.useMemo(() => {
    let filtered = workItems;

    // Apply text filter (using debounced value)
    if (debouncedFilterText) {
      filtered = filtered.filter(
        (item) =>
          item.id.toLowerCase().includes(debouncedFilterText.toLowerCase()) ||
          item.title
            .toLowerCase()
            .includes(debouncedFilterText.toLowerCase()) ||
          item.state
            .toLowerCase()
            .includes(debouncedFilterText.toLowerCase()) ||
          item.assignedTo
            ?.toLowerCase()
            .includes(debouncedFilterText.toLowerCase())
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle null/undefined values
        if (aVal === null || aVal === undefined) {
          if (bVal === null || bVal === undefined) return 0;

          return sortDirection === "asc" ? 1 : -1;
        }
        if (bVal === null || bVal === undefined) {
          return sortDirection === "asc" ? -1 : 1;
        }

        // Handle date fields
        if (
          sortField === "createdDate" ||
          sortField === "workaroundDueDate" ||
          sortField === "solutionDueDate"
        ) {
          aVal = new Date(aVal as string).getTime();
          bVal = new Date(bVal as string).getTime();
        }

        // Handle priority (number)
        if (sortField === "priority") {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;

        return 0;
      });
    }

    return filtered;
  }, [workItems, debouncedFilterText, sortField, sortDirection]);

  // Filter overdue work items
  const overdueWorkItems = workItems.filter((item) => {
    const now = new Date();
    const workaroundOverdue =
      new Date(item.workaroundDueDate) < now && !item.hasWorkaround;
    const solutionOverdue =
      new Date(item.solutionDueDate) < now && !item.hasSolution;

    return workaroundOverdue || solutionOverdue;
  });

  // Toggle selection for overdue items
  const toggleSelectOverdue = (itemId: string) => {
    setSelectedOverdueItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }

      return newSet;
    });
  };

  // Select all overdue items
  const selectAllOverdue = () => {
    setSelectedOverdueItems(new Set(overdueWorkItems.map((item) => item.id)));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedOverdueItems(new Set());
  };

  // Generate Teams message
  const generateTeamsMessage = () => {
    const selectedItems = overdueWorkItems.filter((item) =>
      selectedOverdueItems.has(item.id)
    );

    if (selectedItems.length === 0) {
      setTeamsMessage("⚠️ No items selected");

      return;
    }

    const message = `🚨 **SLA Overdue Alert**\n\n**${
      selectedItems.length
    } work item(s) are past due:**\n\n${selectedItems
      .map((item) => {
        const workaroundOverdue =
          new Date(item.workaroundDueDate) < new Date() && !item.hasWorkaround;
        const solutionOverdue =
          new Date(item.solutionDueDate) < new Date() && !item.hasSolution;

        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);

          const month = MONTHS[date.getMonth()];
          const day = String(date.getDate()).padStart(2, "0");
          const year = date.getFullYear();

          return `${month}-${day}-${year}`;
        };

        return `**[${item.id}] ${item.title}**\n- Priority: P${
          item.priority
        }\n- Created: ${formatDate(item.createdDate)}\n- Assigned To: ${
          item.assignedTo ? item.assignedTo : "Unassigned"
        }\n${
          workaroundOverdue
            ? `- ⚠️ Workaround overdue: ${formatDate(item.workaroundDueDate)}\n`
            : ""
        }${
          solutionOverdue
            ? `- ⚠️ Solution overdue: ${formatDate(item.solutionDueDate)}\n`
            : ""
        }`;
      })
      .join("\n\n")}`;

    setTeamsMessage(message);
  };

  // Send to Teams
  const handleSendToTeams = async () => {
    if (!teamsMessage || teamsMessage.includes("No items selected")) {
      return;
    }

    setIsSendingToTeams(true);

    try {
      const response = await fetch("/api/teams/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: teamsMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send Teams notification");
      }

      alert("✅ Message sent to Teams successfully!");
      clearAllSelections();
      setTeamsMessage("");
    } catch (err) {
      alert(
        `❌ Failed to send to Teams: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsSendingToTeams(false);
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

            {/* Configuration Error Warning */}
            {configError && (
              <Box
                bg="orange.50"
                border="1px solid"
                borderColor="orange.300"
                borderRadius="md"
                p={3}
              >
                <Flex align="center" gap={2}>
                  <Text fontSize="lg">⚠️</Text>
                  <Text color="orange.800" fontSize="sm" fontWeight="medium">
                    {configError}
                  </Text>
                </Flex>
              </Box>
            )}

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
            {/* Filter Input */}
            <Box p={4} borderBottom="1px solid" borderColor="gray.200">
              <InputGroup startElement={<Box>🔍</Box>}>
                <Input
                  placeholder="Filter by ID, Title, State, or Assigned To..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  size="md"
                />
              </InputGroup>
              {filterText && (
                <Text fontSize="sm" color="gray.600" mt={2}>
                  Showing {filteredAndSortedWorkItems.length} of{" "}
                  {workItems.length} items
                </Text>
              )}
            </Box>
            <Box overflowX="auto">
              <Table.Root size="sm" variant="line">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("id")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        ID
                        {sortField === "id" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("title")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        Title
                        {sortField === "title" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("state")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        State
                        {sortField === "state" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("priority")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        Priority
                        {sortField === "priority" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("createdDate")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        Created Date
                        {sortField === "createdDate" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("workaroundDueDate")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        Workaround Due
                        {sortField === "workaroundDueDate" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="bold"
                      cursor="pointer"
                      onClick={() => handleSort("solutionDueDate")}
                      _hover={{ bg: "gray.100" }}
                    >
                      <Flex align="center" gap={1}>
                        Solution Due
                        {sortField === "solutionDueDate" && (
                          <Text fontSize="xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">
                      Status
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredAndSortedWorkItems.map((item) => {
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
                          <Table.Cell
                            color="gray.600"
                            title={new Date(item.createdDate).toLocaleString()}
                          >
                            {new Date(item.createdDate).toLocaleDateString()}
                          </Table.Cell>
                          <Table.Cell
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
                            title={new Date(
                              item.workaroundDueDate
                            ).toLocaleString()}
                          >
                            {new Date(
                              item.workaroundDueDate
                            ).toLocaleDateString()}
                          </Table.Cell>
                          <Table.Cell
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
                            title={new Date(
                              item.solutionDueDate
                            ).toLocaleString()}
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

        {/* Overdue Items - Teams Notification Section */}
        {overdueWorkItems.length > 0 && (
          <Box
            bg="orange.50"
            borderRadius="xl"
            border="1px solid"
            borderColor="orange.200"
            shadow="sm"
            overflow="hidden"
          >
            <Box p={6}>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="lg" color="orange.800">
                  🚨 Overdue Items ({overdueWorkItems.length})
                </Heading>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllOverdue}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearAllSelections}
                  >
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={generateTeamsMessage}
                    disabled={selectedOverdueItems.size === 0}
                  >
                    Generate Message
                  </Button>
                </Flex>
              </Flex>

              {/* Selectable Overdue Items Table */}
              <Box overflowX="auto" mb={6}>
                <Table.Root size="sm" variant="line">
                  <Table.Header>
                    <Table.Row bg="orange.100">
                      <Table.ColumnHeader width="50px">
                        Select
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>ID</Table.ColumnHeader>
                      <Table.ColumnHeader>Title</Table.ColumnHeader>
                      <Table.ColumnHeader>Priority</Table.ColumnHeader>
                      <Table.ColumnHeader>Created Date</Table.ColumnHeader>
                      <Table.ColumnHeader>Assigned To</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                      <Table.ColumnHeader>Overdue Reason</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {overdueWorkItems.map((item) => {
                      const workaroundOverdue =
                        new Date(item.workaroundDueDate) < new Date() &&
                        !item.hasWorkaround;
                      const solutionOverdue =
                        new Date(item.solutionDueDate) < new Date() &&
                        !item.hasSolution;

                      return (
                        <Table.Row
                          key={item.id}
                          bg={
                            selectedOverdueItems.has(item.id)
                              ? "blue.50"
                              : "white"
                          }
                        >
                          <Table.Cell>
                            <input
                              type="checkbox"
                              checked={selectedOverdueItems.has(item.id)}
                              onChange={() => toggleSelectOverdue(item.id)}
                              style={{
                                cursor: "pointer",
                                width: "16px",
                                height: "16px",
                              }}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette="blue">{item.id}</Badge>
                          </Table.Cell>
                          <Table.Cell maxW="300px" truncate title={item.title}>
                            {item.title}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              colorPalette={
                                item.priority === 1
                                  ? "red"
                                  : item.priority === 2
                                  ? "orange"
                                  : "yellow"
                              }
                            >
                              P{item.priority}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell
                            color="gray.600"
                            title={new Date(item.createdDate).toLocaleString()}
                          >
                            {new Date(item.createdDate).toLocaleDateString()}
                          </Table.Cell>
                          <Table.Cell>{item.assignedTo}</Table.Cell>
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
                          <Table.Cell>
                            <Stack gap={1}>
                              {workaroundOverdue && (
                                <Badge colorPalette="red" size="sm">
                                  Workaround:{" "}
                                  {new Date(
                                    item.workaroundDueDate
                                  ).toLocaleDateString()}
                                </Badge>
                              )}
                              {solutionOverdue && (
                                <Badge colorPalette="red" size="sm">
                                  Solution:{" "}
                                  {new Date(
                                    item.solutionDueDate
                                  ).toLocaleDateString()}
                                </Badge>
                              )}
                            </Stack>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Message Preview Section */}
              {teamsMessage && (
                <Box
                  bg="white"
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="gray.200"
                  mb={4}
                >
                  <Heading size="sm" mb={3} color="gray.700">
                    📝 Message Preview
                  </Heading>
                  <Box
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.300"
                    whiteSpace="pre-wrap"
                    fontSize="sm"
                    fontFamily="monospace"
                    maxH="400px"
                    overflowY="auto"
                  >
                    {teamsMessage}
                  </Box>
                </Box>
              )}

              {/* Send Button */}
              {teamsMessage && !teamsMessage.includes("No items selected") && (
                <Flex justify="flex-end">
                  <Button
                    colorPalette="green"
                    size="lg"
                    onClick={handleSendToTeams}
                    loading={isSendingToTeams}
                    loadingText="Sending..."
                  >
                    📤 Send to Teams
                  </Button>
                </Flex>
              )}
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
