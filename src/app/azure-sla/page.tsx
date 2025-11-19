"use client";

import { Box, Flex, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useAzureStore } from "@/stores/azureStore";
import {
  type AzureWorkItem,
  type FetchWorkItemsParams,
  useAzureWorkItems,
} from "@/services/azureQueries";
import AzureConfigForm from "@/components/azure/AzureConfigForm";
import BugTicketsTable from "@/components/azure/BugTicketsTable";
import OverdueItemsSection from "@/components/azure/OverdueItemsSection";

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
  // Azure Store
  const azureStore = useAzureStore();

  // Configuration state - use user input or fall back to stored values
  const [userProject, setUserProject] = useState("");
  const [userAreaPath, setUserAreaPath] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Derived values that prefer user input over stored values
  const project = userProject || azureStore.project || "";
  const areaPath = userAreaPath || azureStore.areaPath || "";

  // Check auth validity
  const isAuthValid = azureStore.isAuthValid();

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

    // Save to Azure store
    azureStore.setAreaPath(areaPath.trim());
    azureStore.setProject(project.trim());

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
      azureStore.clearAuth();
    }
  }, [error, azureStore]);

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

  // Show loading spinner until store has hydrated from localStorage
  if (!azureStore.hasHydrated) {
    return (
      <Box p={8}>
        <Flex justify="center" align="center" minH="50vh">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Stack gap={6}>
        <Heading size="2xl" color="gray.700">
          Azure SLA Tracker
        </Heading>

        {/* Auth Warning */}
        {!isAuthValid && (
          <Box
            bg="red.50"
            border="1px solid"
            borderColor="red.300"
            borderRadius="md"
            p={4}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="lg">⚠️</Text>
              <Text color="red.800" fontSize="sm" fontWeight="medium">
                Authentication expired or not set. Please connect to Azure
                DevOps using the header above.
              </Text>
            </Flex>
          </Box>
        )}

        {/* Configuration Form */}
        <AzureConfigForm
          project={project}
          areaPath={areaPath}
          startDate={startDate}
          endDate={endDate}
          configError={configError}
          isLoading={isLoading}
          onProjectChange={setUserProject}
          onAreaPathChange={setUserAreaPath}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onFetch={handleFetchWorkItems}
        />

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
          <BugTicketsTable
            workItems={workItems}
            filteredAndSortedWorkItems={filteredAndSortedWorkItems}
            expandedItems={expandedItems}
            filterText={filterText}
            sortField={sortField}
            sortDirection={sortDirection}
            onFilterChange={setFilterText}
            onSort={handleSort}
            onToggleExpand={toggleExpand}
          />
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
        <OverdueItemsSection
          overdueWorkItems={overdueWorkItems}
          selectedOverdueItems={selectedOverdueItems}
          teamsMessage={teamsMessage}
          isSendingToTeams={isSendingToTeams}
          onSelectAll={selectAllOverdue}
          onClearAll={clearAllSelections}
          onToggleSelect={toggleSelectOverdue}
          onGenerateMessage={generateTeamsMessage}
          onSendToTeams={handleSendToTeams}
        />
      </Stack>
    </Box>
  );
}
