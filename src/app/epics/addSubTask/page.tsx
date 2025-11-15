"use client";

import {
  Box,
  Text,
  Button,
  Input,
  Stack,
  Flex,
  Spinner,
  Textarea,
  Badge,
  Select,
} from "@chakra-ui/react";
import { useState, useEffect, Suspense } from "react";
import { useAuthStore, useDataStore } from "@/stores";
import { useRouter, useSearchParams } from "next/navigation";
import { validateTimeTrackingFormat } from "@/utils/jiraDateUtils";
import {
  useComponents,
  useTypeOfWork,
  useCreateSubtask,
  useEpic,
  useDefectPatterns,
} from "@/services/jiraQueries";
import { createListCollection } from "@chakra-ui/react";

function AddSubTaskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentKey = searchParams.get("parentKey");

  // Form state
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [reporter, setReporter] = useState("");

  // New required fields
  const [componentId, setComponentId] = useState("");
  const [productId, setProductId] = useState("");
  const [typeOfWork, setTypeOfWork] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [originalEstimate, setOriginalEstimate] = useState("");
  const [remainingEstimate, setRemainingEstimate] = useState("");

  // Metadata state
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auth store
  const { isConnected, user } = useAuthStore();

  // Data store
  const { currentEpic, setCurrentEpic, setEpicError } = useDataStore();

  // React Query hooks for metadata and epic fetching
  const { data: fetchedEpic, error: epicQueryError } = useEpic(
    parentKey || null
  );

  const { data: components = [], isLoading: isLoadingComponents } =
    useComponents(currentEpic?.project?.id || null);

  const { data: typeOfWorkOptions = [], isLoading: isLoadingTypeOfWork } =
    useTypeOfWork(currentEpic?.project?.id || null, currentEpic?.key || null);

  // React Query hook for defect patterns (product options)
  const { data: productOptions = [], isLoading: isLoadingProductOptions } =
    useDefectPatterns(
      currentEpic?.id || null,
      currentEpic?.project?.id || null
    );

  // Combined loading state
  const isLoadingMetadata =
    isLoadingComponents || isLoadingTypeOfWork || isLoadingProductOptions;

  // Create subtask mutation
  const createSubtaskMutation = useCreateSubtask();

  // Utility function to extract username from email address
  const extractUsernameFromEmail = (emailAddress: string): string => {
    if (!emailAddress) return "";
    // Split by space and take the first element to get the username part
    // e.g., "john at fpt dot com" -> ["john", "at", "fpt", "dot", "com"] -> "john"
    const parts = emailAddress.split(" ");
    return parts[0] || "";
  };

  // Create collections for select components
  const componentCollection = createListCollection({
    items: components.map((component) => ({
      value: component.id,
      label: component.name,
    })),
  });

  const typeOfWorkCollection = createListCollection({
    items: typeOfWorkOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  });

  // Create product options collection for select component
  const productCollection = createListCollection({
    items: productOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  });

  // Set default values when component mounts
  useEffect(() => {
    // Set to HTML input compatible formats
    const now = new Date();

    // For datetime-local input: "2025-10-28T14:30"
    const plannedStartISO = new Date(now.getTime() + 60000)
      .toISOString()
      .slice(0, 16); // Add 1 minute
    setPlannedStart(plannedStartISO);

    // For date input: "2025-10-28"
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateISO = tomorrow.toISOString().slice(0, 10);
    setDueDate(dueDateISO);

    setOriginalEstimate("8h");
    setRemainingEstimate("8h");
  }, []);

  useEffect(() => {
    // Sync fetched epic with dataStore
    if (fetchedEpic) {
      setCurrentEpic(fetchedEpic);
      setEpicError(null);
    } else if (epicQueryError) {
      setCurrentEpic(null);
      const errorMessage =
        epicQueryError instanceof Error
          ? epicQueryError.message
          : "Failed to fetch epic";
      setEpicError(errorMessage);
    }
  }, [fetchedEpic, epicQueryError, setCurrentEpic, setEpicError]);

  useEffect(() => {
    // Set default assignee and reporter from currentEpic when it changes
    if (currentEpic) {
      // Set assignee from epic's assignee if available
      if (currentEpic.assignee?.emailAddress) {
        const assigneeUsername = extractUsernameFromEmail(
          currentEpic.assignee.emailAddress
        );
        setAssignee(assigneeUsername);
      }

      // Set reporter from epic's reporter if available
      if (currentEpic.reporter?.emailAddress) {
        const reporterUsername = extractUsernameFromEmail(
          currentEpic.reporter.emailAddress
        );
        setReporter(reporterUsername);
      }
    }
  }, [currentEpic]);

  useEffect(() => {
    // If no parent key provided, redirect back to epics
    if (!parentKey) {
      router.push("/epics");
      return;
    }

    // If not connected, redirect to epics page
    if (!isConnected) {
      router.push("/epics");
      return;
    }
  }, [parentKey, isConnected, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !summary.trim() ||
      !parentKey ||
      !isConnected ||
      !currentEpic ||
      !componentId ||
      !productId ||
      !typeOfWork ||
      !plannedStart ||
      !dueDate ||
      !originalEstimate ||
      !remainingEstimate
    ) {
      setCreateError("Please fill in all required fields");
      return;
    }

    // Validate time tracking format
    if (
      !validateTimeTrackingFormat(originalEstimate) ||
      !validateTimeTrackingFormat(remainingEstimate)
    ) {
      setCreateError(
        'Time estimates must be in format like "8h", "2d", "1w 3d", etc.'
      );
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      // Send dates directly as they come from HTML inputs (ISO compatible)
      await createSubtaskMutation.mutateAsync({
        parentKey: parentKey,
        projectKey: currentEpic.project.key,
        summary: summary.trim(),
        description: description.trim() || undefined,
        assignee: assignee.trim() || undefined,
        reporter: reporter.trim() || undefined,
        componentId: componentId,
        productId: productId,
        typeOfWork: typeOfWork,
        plannedStart: plannedStart, // HTML datetime-local format: "2025-10-28T14:30"
        dueDate: dueDate, // HTML date format: "2025-10-28"
        originalEstimate: originalEstimate.trim(),
        remainingEstimate: remainingEstimate.trim(),
      });

      setSuccess(true);

      // Reset form
      setSummary("");
      setDescription("");
      setAssignee("");
      setReporter("");
      setComponentId("");
      setProductId("");
      setTypeOfWork("");
      setPlannedStart("");
      setDueDate("");
      setOriginalEstimate("");
      setRemainingEstimate("");

      // Show success message and redirect after a delay
      setTimeout(() => {
        router.push("/epics");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create subtask";
      setCreateError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push("/epics");
  };

  if (!parentKey) {
    return (
      <Box p={6} textAlign="center">
        <Text>No parent epic specified. Redirecting...</Text>
      </Box>
    );
  }

  if (!isConnected) {
    return (
      <Box p={6} textAlign="center">
        <Text>Please connect to Jira first. Redirecting...</Text>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="4xl" mx="auto">
      {/* Parent Epic Info */}
      {currentEpic && (
        <Box
          p={4}
          bg="rgba(255,255,255,0.95)"
          borderRadius="lg"
          backdropFilter="blur(10px)"
          mb={6}
        >
          <Text fontSize="sm" color="gray.600" mb={2}>
            Creating subtask for:
          </Text>
          <Flex align="center" gap={3}>
            <Badge colorPalette="blue" size="lg">
              {currentEpic.key}
            </Badge>
            <Text fontWeight="medium">{currentEpic.summary}</Text>
          </Flex>
        </Box>
      )}

      {/* Success Message */}
      {success && (
        <Box
          p={4}
          bg="green.50"
          borderRadius="md"
          border="1px solid"
          borderColor="green.200"
          mb={6}
        >
          <Text color="green.800">
            ✅ Subtask created successfully! Redirecting back to epics...
          </Text>
        </Box>
      )}

      {/* Error Message */}
      {createError && (
        <Box
          p={4}
          bg="red.50"
          borderRadius="md"
          border="1px solid"
          borderColor="red.200"
          mb={6}
        >
          <Text color="red.800">❌ {createError}</Text>
        </Box>
      )}

      {/* Loading Metadata */}
      {isLoadingMetadata && (
        <Box
          p={4}
          bg="blue.50"
          borderRadius="md"
          border="1px solid"
          borderColor="blue.200"
          mb={6}
        >
          <Flex align="center" gap={3}>
            <Spinner size="sm" />
            <Text color="blue.800">Loading form data...</Text>
          </Flex>
        </Box>
      )}

      {/* Create Subtask Form */}
      <Box
        p={6}
        bg="rgba(255,255,255,0.95)"
        borderRadius="lg"
        backdropFilter="blur(10px)"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <Box>
              <Text fontWeight="medium" mb={2}>
                Summary *
              </Text>
              <Input
                placeholder="Enter subtask summary..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                disabled={isCreating || success}
              />
            </Box>

            <Box>
              <Text fontWeight="medium" mb={2}>
                Description
              </Text>
              <Textarea
                placeholder="Enter subtask description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={isCreating || success}
              />
            </Box>

            {/* Component Selection */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Component *
              </Text>
              <Select.Root
                collection={componentCollection}
                value={[componentId]}
                onValueChange={(details) =>
                  setComponentId(details.value[0] || "")
                }
                disabled={isCreating || success || isLoadingMetadata}
                required
              >
                <Select.Label>Component</Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select a component..." />
                    <Select.Indicator />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {componentCollection.items.map((item) => (
                      <Select.Item key={item.value} item={item}>
                        <Select.ItemText>{item.label}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </Box>

            {/* Product Selection */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Product *
              </Text>
              <Select.Root
                collection={productCollection}
                value={[productId]}
                onValueChange={(details) =>
                  setProductId(details.value[0] || "")
                }
                disabled={isCreating || success || isLoadingMetadata}
                required
              >
                <Select.Label>Product</Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select a product..." />
                    <Select.Indicator />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {productCollection.items.map((item) => (
                      <Select.Item key={item.value} item={item}>
                        <Select.ItemText>{item.label}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
              {isLoadingProductOptions && (
                <Text fontSize="xs" color="blue.500" mt={1}>
                  Loading product options...
                </Text>
              )}
            </Box>

            {/* Type of Work Selection */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Type of Work *
              </Text>
              <Select.Root
                collection={typeOfWorkCollection}
                value={[typeOfWork]}
                onValueChange={(details) =>
                  setTypeOfWork(details.value[0] || "")
                }
                disabled={isCreating || success || isLoadingMetadata}
                required
              >
                <Select.Label>Type of Work</Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select type of work..." />
                    <Select.Indicator />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {typeOfWorkCollection.items.map((item) => (
                      <Select.Item key={item.value} item={item}>
                        <Select.ItemText>{item.label}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </Box>

            {/* Date Fields */}
            <Flex gap={4}>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>
                  Planned Start *
                </Text>
                <Input
                  type="datetime-local"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                  required
                  disabled={isCreating || success}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Will be sent as ISO datetime format to Jira
                </Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>
                  Due Date *
                </Text>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  disabled={isCreating || success}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Will be sent as ISO date format to Jira
                </Text>
              </Box>
            </Flex>

            {/* Time Tracking */}
            <Flex gap={4}>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>
                  Original Estimate *
                </Text>
                <Input
                  placeholder="e.g., 8h, 2d, 1w 3d"
                  value={originalEstimate}
                  onChange={(e) => setOriginalEstimate(e.target.value)}
                  required
                  disabled={isCreating || success}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Examples: 8h, 2d, 1w 3d 4h
                </Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>
                  Remaining Estimate *
                </Text>
                <Input
                  placeholder="e.g., 8h, 2d, 1w 3d"
                  value={remainingEstimate}
                  onChange={(e) => setRemainingEstimate(e.target.value)}
                  required
                  disabled={isCreating || success}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Examples: 8h, 2d, 1w 3d 4h
                </Text>
              </Box>
            </Flex>

            <Box>
              <Flex align="center" gap={2} mb={2}>
                <Text fontWeight="medium">Assignee</Text>
                {currentEpic?.assignee?.emailAddress &&
                  assignee ===
                    extractUsernameFromEmail(
                      currentEpic.assignee.emailAddress
                    ) && (
                    <Badge size="sm" colorPalette="blue">
                      From Epic
                    </Badge>
                  )}
              </Flex>
              <Input
                placeholder="Enter assignee username (optional)..."
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                disabled={isCreating || success}
              />
              <Flex align="center" gap={4} mt={2} wrap="wrap">
                {user && (
                  <Flex align="center" gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignee(user.name || "")}
                      disabled={isCreating || success}
                    >
                      Assign to me
                    </Button>
                    <Text fontSize="sm" color="gray.600">
                      ({user.name})
                    </Text>
                  </Flex>
                )}
                {currentEpic?.assignee?.emailAddress && (
                  <Flex align="center" gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="blue"
                      onClick={() => {
                        if (currentEpic?.assignee?.emailAddress) {
                          setAssignee(
                            extractUsernameFromEmail(
                              currentEpic.assignee.emailAddress
                            )
                          );
                        }
                      }}
                      disabled={isCreating || success}
                    >
                      Use Epic Assignee
                    </Button>
                    <Text fontSize="sm" color="blue.600">
                      (
                      {extractUsernameFromEmail(
                        currentEpic.assignee.emailAddress
                      )}
                      )
                    </Text>
                  </Flex>
                )}
              </Flex>
            </Box>

            <Box>
              <Flex align="center" gap={2} mb={2}>
                <Text fontWeight="medium">Reporter</Text>
                {currentEpic?.reporter?.emailAddress &&
                  reporter ===
                    extractUsernameFromEmail(
                      currentEpic.reporter.emailAddress
                    ) && (
                    <Badge size="sm" colorPalette="purple">
                      From Epic
                    </Badge>
                  )}
              </Flex>
              <Input
                placeholder="Enter reporter username (optional)..."
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                disabled={isCreating || success}
              />
              <Flex align="center" gap={4} mt={2} wrap="wrap">
                {user && (
                  <Flex align="center" gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReporter(user.name || "")}
                      disabled={isCreating || success}
                    >
                      Report by me
                    </Button>
                    <Text fontSize="sm" color="gray.600">
                      ({user.name})
                    </Text>
                  </Flex>
                )}
                {currentEpic?.reporter?.emailAddress && (
                  <Flex align="center" gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="purple"
                      onClick={() => {
                        if (currentEpic?.reporter?.emailAddress) {
                          setReporter(
                            extractUsernameFromEmail(
                              currentEpic.reporter.emailAddress
                            )
                          );
                        }
                      }}
                      disabled={isCreating || success}
                    >
                      Use Epic Reporter
                    </Button>
                    <Text fontSize="sm" color="purple.600">
                      (
                      {extractUsernameFromEmail(
                        currentEpic.reporter.emailAddress
                      )}
                      )
                    </Text>
                  </Flex>
                )}
              </Flex>
            </Box>

            <Flex gap={4} justify="flex-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isCreating || success}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                colorPalette="green"
                disabled={
                  isCreating ||
                  !summary.trim() ||
                  success ||
                  isLoadingMetadata ||
                  !componentId ||
                  !productId ||
                  !typeOfWork ||
                  !plannedStart ||
                  !dueDate ||
                  !originalEstimate ||
                  !remainingEstimate
                }
              >
                {isCreating ? (
                  <Flex align="center" gap={2}>
                    <Spinner size="sm" />
                    Creating...
                  </Flex>
                ) : (
                  "Create Subtask"
                )}
              </Button>
            </Flex>
          </Stack>
        </form>
      </Box>

      {/* Flash Footer */}
      <Box textAlign="center" mt={12}>
        <Text color="rgba(0, 0, 0, 0.8)" fontSize="sm">
          Flash is helping you create subtasks... slowly but surely! 🦥
        </Text>
      </Box>
    </Box>
  );
}

export default function AddSubTaskPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AddSubTaskContent />
    </Suspense>
  );
}
