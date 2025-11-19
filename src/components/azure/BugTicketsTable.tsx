"use client";

import {
  Badge,
  Box,
  Flex,
  Heading,
  Input,
  InputGroup,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import React from "react";
import type { AzureWorkItem } from "@/services/azureQueries";

interface BugTicketsTableProps {
  workItems: AzureWorkItem[];
  filteredAndSortedWorkItems: AzureWorkItem[];
  expandedItems: Set<string>;
  filterText: string;
  sortField: keyof AzureWorkItem | null;
  sortDirection: "asc" | "desc";
  onFilterChange: (value: string) => void;
  onSort: (field: keyof AzureWorkItem) => void;
  onToggleExpand: (itemId: string) => void;
}

export default function BugTicketsTable({
  workItems,
  filteredAndSortedWorkItems,
  expandedItems,
  filterText,
  sortField,
  sortDirection,
  onFilterChange,
  onSort,
  onToggleExpand,
}: BugTicketsTableProps) {
  return (
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
            onChange={(e) => onFilterChange(e.target.value)}
            size="md"
          />
        </InputGroup>
        {filterText && (
          <Text fontSize="sm" color="gray.600" mt={2}>
            Showing {filteredAndSortedWorkItems.length} of {workItems.length}{" "}
            items
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
                onClick={() => onSort("id")}
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
                onClick={() => onSort("title")}
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
                onClick={() => onSort("state")}
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
                onClick={() => onSort("priority")}
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
                onClick={() => onSort("createdDate")}
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
                onClick={() => onSort("workaroundDueDate")}
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
                onClick={() => onSort("solutionDueDate")}
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
                    onClick={() => onToggleExpand(item.id)}
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
                                  <Flex justify="space-between" mb={2} gap={2}>
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
  );
}
