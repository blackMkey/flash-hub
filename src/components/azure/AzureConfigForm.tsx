"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

interface AzureConfigFormProps {
  project: string;
  areaPath: string;
  startDate: string;
  endDate: string;
  configError: string | null;
  isLoading: boolean;
  onProjectChange: (value: string) => void;
  onAreaPathChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onFetch: () => void;
}

export default function AzureConfigForm({
  project,
  areaPath,
  startDate,
  endDate,
  configError,
  isLoading,
  onProjectChange,
  onAreaPathChange,
  onStartDateChange,
  onEndDateChange,
  onFetch,
}: AzureConfigFormProps) {
  const handleQuickDate = (days: number) => {
    const today = new Date();
    const startDay = new Date(today);

    startDay.setDate(startDay.getDate() - days);
    onStartDateChange(startDay.toISOString().split("T")[0]);
    onEndDateChange(today.toISOString().split("T")[0]);
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const firstDay = `${year}-${month}-01`;

    onStartDateChange(firstDay);
    onEndDateChange(today.toISOString().split("T")[0]);
  };

  return (
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
              onChange={(e) => onProjectChange(e.target.value)}
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
              onChange={(e) => onAreaPathChange(e.target.value)}
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
              onChange={(e) => onStartDateChange(e.target.value)}
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
              onChange={(e) => onEndDateChange(e.target.value)}
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
              onClick={() => handleQuickDate(1)}
            >
              1 Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(7)}
            >
              1 Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(30)}
            >
              1 Month
            </Button>
            <Button variant="outline" size="sm" onClick={handleCurrentMonth}>
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
            onClick={onFetch}
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
  );
}
