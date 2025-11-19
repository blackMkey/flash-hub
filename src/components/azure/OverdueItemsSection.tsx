"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Stack,
  Table,
} from "@chakra-ui/react";
import type { AzureWorkItem } from "@/services/azureQueries";

interface OverdueItemsSectionProps {
  overdueWorkItems: AzureWorkItem[];
  selectedOverdueItems: Set<string>;
  teamsMessage: string;
  isSendingToTeams: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
  onToggleSelect: (itemId: string) => void;
  onGenerateMessage: () => void;
  onSendToTeams: () => void;
}

export default function OverdueItemsSection({
  overdueWorkItems,
  selectedOverdueItems,
  teamsMessage,
  isSendingToTeams,
  onSelectAll,
  onClearAll,
  onToggleSelect,
  onGenerateMessage,
  onSendToTeams,
}: OverdueItemsSectionProps) {
  if (overdueWorkItems.length === 0) {
    return null;
  }

  return (
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
            <Button size="sm" variant="outline" onClick={onSelectAll}>
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={onClearAll}>
              Clear All
            </Button>
            <Button
              size="sm"
              colorPalette="blue"
              onClick={onGenerateMessage}
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
                <Table.ColumnHeader width="50px">Select</Table.ColumnHeader>
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
                    bg={selectedOverdueItems.has(item.id) ? "blue.50" : "white"}
                  >
                    <Table.Cell>
                      <input
                        type="checkbox"
                        checked={selectedOverdueItems.has(item.id)}
                        onChange={() => onToggleSelect(item.id)}
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
              onClick={onSendToTeams}
              loading={isSendingToTeams}
              loadingText="Sending..."
            >
              📤 Send to Teams
            </Button>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
