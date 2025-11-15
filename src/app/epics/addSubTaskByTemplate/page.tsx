'use client'

import {
  Badge,
  Box,
  Button,
  Flex,
  Spinner,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useAuthStore, useDataStore } from '@/stores'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEpic } from '@/services/jiraQueries'
import { useExcelExport } from '@/services/useExcelExport'
import type { ParseResult } from '@/services/excelService'
import type { BulkCreateResult } from '@/services/jiraFetchers'

// State configuration objects
const STATE_COLORS = {
  idle: 'blue',
  uploading: 'yellow',
  complete: 'green',
  error: 'red'
} as const

const STATE_TEXT = {
  idle: '⏳ Ready',
  uploading: '⬆️ Creating...',
  complete: '✅ Complete',
  error: '❌ Error'
} as const

function AddSubTaskByTemplateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parentKey = searchParams.get('parentKey')
  const epicKey = searchParams.get('epicKey')
  const mode = searchParams.get('mode') // 'multiepic' or null for single epic
  const isMultiEpicMode = mode === 'multiepic'

  // Auth store
  const { isConnected, user } = useAuthStore()

  // Data store
  const { currentEpic, setCurrentEpic, setEpicError } = useDataStore()

  // React Query hooks for epic fetching
  const { 
    data: fetchedEpic,
    error: epicQueryError
  } = useEpic(epicKey || null)

  // Excel export functionality
  const { isExporting, exportError, downloadSubtaskTemplate, parseSubtaskTemplate, isParsing, parseError, isCreating, createError, createBulkSubtasks } = useExcelExport()

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkCreateResult | null>(null)

  useEffect(() => {
    // Sync fetched epic with dataStore
    if (fetchedEpic) {
      setCurrentEpic(fetchedEpic)
      setEpicError(null)
    } else if (epicQueryError) {
      setCurrentEpic(null)
      const errorMessage = epicQueryError instanceof Error ? epicQueryError.message : 'Failed to fetch epic'

      setEpicError(errorMessage)
    }
  }, [fetchedEpic, epicQueryError, setCurrentEpic, setEpicError])

  useEffect(() => {
    // For single epic mode, parent key is required
    // For multi epic mode, parent key is not required
    if (!isMultiEpicMode && !parentKey) {
      router.push('/epics')

      return
    }

    // If not connected, redirect to epics page
    if (!isConnected) {
      router.push('/epics')

      return
    }
  }, [parentKey, isConnected, router, isMultiEpicMode])

  // File upload handlers
  const handleFileSelect = async (file: File) => {
    if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.name.endsWith('.xlsx')) {
      setUploadedFile(file)
      setParseResult(null) // Clear previous results
      
      // Parse the file automatically when selected
      const result = await parseSubtaskTemplate(file)

      if (result) {
        setParseResult(result)
      }
    } else {
      alert('Please select a valid Excel file (.xlsx)')
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files

    if (files && files.length > 0) {
      await handleFileSelect(files[0])
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleCreateSubtasks = async () => {
    if (!parseResult) {
      return
    }
    
    // For multi-epic mode, we don't need specific epic/project context
    // For single epic mode, we use the current epic's information
    const parentKeyToUse = isMultiEpicMode ? 'MULTI-EPIC' : (currentEpic?.key || '')
    const projectKeyToUse = isMultiEpicMode ? 'MULTI-PROJECT' : (currentEpic?.project.key || '')
    
    const result = await createBulkSubtasks(
      parentKeyToUse,
      projectKeyToUse,
      parseResult.subtasks,
      isMultiEpicMode
    )
    
    if (result) {
      // Update successful subtasks state
      result.successful.forEach((success) => {
        updateSubtaskState(success.index-1, 'complete')
      })
      
      // Update failed subtasks state
      result.failed.forEach((failure) => {
        updateSubtaskState(failure.index-1, 'error')
      })
      
      setBulkResult(result)
    }
  }

  const handleCancel = () => {
    router.push('/epics')
  }

  // Function to update the state of a specific subtask
  const updateSubtaskState = (index: number, newState: 'idle' | 'uploading' | 'complete' | 'error') => {
    if (!parseResult) return
    
    const updatedSubtasks = parseResult.subtasks.map((subtask, i) => 
      i === index ? { ...subtask, state: newState } : subtask
    )
    
    setParseResult({
      ...parseResult,
      subtasks: updatedSubtasks
    })
  }

  if (!isConnected) {
    return (
      <Box p={6} textAlign="center">
        <Text>Please connect to Jira first. Redirecting...</Text>
      </Box>
    )
  }

  return (
    <Box p={6} maxW="4xl" mx="auto">
      {/* Mode Info */}
      {isMultiEpicMode ? (
        <Box p={4} bg="rgba(255,255,255,0.95)" borderRadius="lg" backdropFilter="blur(10px)" mb={6}>
          <Text fontSize="sm" color="gray.600" mb={2}>Multi-Epic Subtask Creation Mode</Text>
          <Flex align="center" gap={3}>
            <Badge colorPalette="purple" size="lg">🌟 Multi-Epic</Badge>
            <Text fontWeight="medium">Create subtasks across multiple epics</Text>
          </Flex>
        </Box>
      ) : (
        currentEpic && (
          <Box p={4} bg="rgba(255,255,255,0.95)" borderRadius="lg" backdropFilter="blur(10px)" mb={6}>
            <Text fontSize="sm" color="gray.600" mb={2}>Creating subtasks by template for:</Text>
            <Flex align="center" gap={3}>
              <Badge colorPalette="blue" size="lg">{currentEpic.key}</Badge>
              <Text fontWeight="medium">{currentEpic.summary}</Text>
            </Flex>
          </Box>
        )
      )}

      {/* Excel Export Error */}
      {exportError && (
        <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200" mb={6}>
          <Text color="red.800">
            ❌ Template Error: {exportError}
          </Text>
        </Box>
      )}

      {/* Template Actions */}
      <Box p={6} bg="rgba(255,255,255,0.95)" borderRadius="lg" backdropFilter="blur(10px)">
        <Stack gap={6}>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".xlsx"
            style={{ display: 'none' }}
          />

          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={2}>
              {isMultiEpicMode ? '🌟 Create Multi-Epic Subtasks by Template' : '📋 Create Subtasks by Template'}
            </Text>
            <Text color="gray.600" mb={2}>
              {isMultiEpicMode 
                ? 'Download an Excel template, fill it with subtask data for multiple epics, and upload it to create subtasks across different epics at once.'
                : 'Download an Excel template, fill it with your subtask data, and upload it to create multiple subtasks at once.'
              }
            </Text>
            {isMultiEpicMode ? (
              <Box p={3} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.200">
                <Text fontSize="sm" color="purple.800" fontWeight="medium">
                  🌟 Multi-Epic Mode: Enhanced Template
                </Text>
                <Text fontSize="sm" color="purple.700">
                  Template includes an Epic column. You can specify different epic keys for each subtask.
                </Text>
              </Box>
            ) : (
              <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                <Text fontSize="sm" color="blue.800" fontWeight="medium">
                  ⚡ New: Bulk API Integration
                </Text>
                <Text fontSize="sm" color="blue.700">
                  Creates all subtasks in a single API call for better performance and reliability.
                </Text>
              </Box>
            )}
            
            {/* Show default assignee/reporter info */}
            {(currentEpic?.assignee?.emailAddress || currentEpic?.reporter?.emailAddress) && (
              <Box p={3} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200" mt={2}>
                <Text fontSize="sm" color="green.800" fontWeight="medium">
                  📋 Template Defaults from Epic
                </Text>
                <Stack gap={1} mt={1}>
                  {currentEpic?.assignee?.emailAddress && (
                    <Text fontSize="sm" color="green.700">
                      • Assignee: {currentEpic.assignee.emailAddress.split(' ')[0]} (from epic assignee)
                    </Text>
                  )}
                  {currentEpic?.reporter?.emailAddress && (
                    <Text fontSize="sm" color="green.700">
                      • Reporter: {currentEpic.reporter.emailAddress.split(' ')[0]} (from epic reporter)
                    </Text>
                  )}
                </Stack>
              </Box>
            )}
          </Box>

          {/* Steps 1 & 2 in one row */}
          <Flex gap={6} align="start">
            {/* Step 1: Download Template */}
            <Box flex="1">
              <Text fontWeight="medium" mb={3}>Step 1: Download Template</Text>
              <Button 
                colorPalette="purple" 
                size="lg" 
                onClick={() => downloadSubtaskTemplate(
                  isMultiEpicMode ? undefined : currentEpic?.project?.id,
                  isMultiEpicMode ? undefined : currentEpic?.id,
                  isMultiEpicMode ? undefined : currentEpic?.key,
                  user?.displayName || user?.emailAddress,
                  isMultiEpicMode ? undefined : currentEpic?.assignee?.emailAddress,
                  isMultiEpicMode ? undefined : currentEpic?.reporter?.emailAddress,
                  isMultiEpicMode
                )}
                disabled={isExporting}
                width="100%"
              >
                {isExporting ? (
                  <Flex align="center" gap={2}>
                    <Spinner size="sm" />
                    Generating...
                  </Flex>
                ) : (
                  '📥 Download Template'
                )}
              </Button>
              <Text fontSize="sm" color="gray.500" mt={2}>
                Pre-formatted Excel with reference data
              </Text>
            </Box>

            {/* Step 2: Upload File */}
            <Box flex="1">
              <Text fontWeight="medium" mb={3}>Step 2: Upload Template</Text>
              <Button 
                colorPalette="blue" 
                size="lg" 
                onClick={triggerFileInput}
                width="100%"
                variant={uploadedFile ? "solid" : "outline"}
              >
                {uploadedFile ? (
                  <Flex align="center" gap={2}>
                    <Text fontSize="sm">✅</Text>
                    {uploadedFile.name.slice(0, 20)}...
                  </Flex>
                ) : (
                  '📁 Select Excel File'
                )}
              </Button>
              <Text fontSize="sm" color="gray.500" mt={2}>
                {uploadedFile ? 
                  `Selected: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : 
                  'Choose completed template file'
                }
              </Text>
            </Box>
          </Flex>

          {/* Step 3: Review Data */}
          {uploadedFile && (
            <Box>
              <Text fontWeight="medium" mb={3}>Step 3: Review Data</Text>
              
              {isParsing && (
                <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200" mb={4}>
                  <Flex align="center" gap={2}>
                    <Spinner size="sm" />
                    <Text color="blue.800">Parsing Excel file...</Text>
                  </Flex>
                </Box>
              )}

              {parseError && (
                <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200" mb={4}>
                  <Text color="red.800" fontWeight="medium">
                    ❌ Parse Error: {parseError}
                  </Text>
                </Box>
              )}

              {parseResult && (
                <Box>
                  {/* Show errors if any */}
                  {parseResult.errors.length > 0 && (
                    <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200" mb={4}>
                      <Text color="red.800" fontWeight="medium" mb={2}>
                        ⚠️ Found {parseResult.errors.length} error(s) in your template:
                      </Text>
                      <Stack gap={1}>
                        {parseResult.errors.slice(0, 5).map((error, index) => (
                          <Text key={index} fontSize="sm" color="red.700">
                            Row {error.row}: {error.field} - {error.message}
                          </Text>
                        ))}
                        {parseResult.errors.length > 5 && (
                          <Text fontSize="sm" color="red.600">
                            ... and {parseResult.errors.length - 5} more errors
                          </Text>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* Summary */}
                  <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200" mb={4}>
                    <Flex justify="space-between" align="center">
                      <Text color="blue.800">
                        📊 Found <strong>{parseResult.subtasks.length}</strong> subtasks to create
                      </Text>
                      <Badge colorPalette={parseResult.errors.length > 0 ? "red" : "green"}>
                        {parseResult.errors.length > 0 ? `${parseResult.errors.length} errors` : 'Ready to create'}
                      </Badge>
                    </Flex>
                  </Box>

                  {/* Full data table */}
                  {parseResult.subtasks.length > 0 && (
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={3}>
                        All {parseResult.subtasks.length} subtasks from your template:
                      </Text>
                      <Box overflowX="auto" bg="white" borderRadius="md" border="1px solid" borderColor="gray.200" maxH="400px" overflowY="auto">
                        <Table.Root size="sm">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader>Row</Table.ColumnHeader>
                              <Table.ColumnHeader>Summary</Table.ColumnHeader>
                              <Table.ColumnHeader>Description</Table.ColumnHeader>
                              <Table.ColumnHeader>Component ID</Table.ColumnHeader>
                              <Table.ColumnHeader>Product ID</Table.ColumnHeader>
                              <Table.ColumnHeader>Type of Work</Table.ColumnHeader>
                              <Table.ColumnHeader>Assignee</Table.ColumnHeader>
                              <Table.ColumnHeader>Reporter</Table.ColumnHeader>
                              {isMultiEpicMode && <Table.ColumnHeader>Epic Key</Table.ColumnHeader>}
                              <Table.ColumnHeader>Estimate</Table.ColumnHeader>
                              <Table.ColumnHeader>State</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {parseResult.subtasks.map((subtask, index) => (
                              <Table.Row key={index}>
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.row}</Text>
                                </Table.Cell>
                                <Table.Cell maxW="200px">
                                  <Text fontSize="sm" lineClamp={2}>
                                    {subtask.summary || '-'}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell maxW="150px">
                                  <Text fontSize="sm" lineClamp={2}>
                                    {subtask.description || '-'}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.componentId || '-'}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.productId || '-'}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.typeOfWork || '-'}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.assignee || '-'}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.reporter || '-'}</Text>
                                </Table.Cell>
                                {isMultiEpicMode && (
                                  <Table.Cell>
                                    <Text fontSize="sm">{subtask.epicKey || '-'}</Text>
                                  </Table.Cell>
                                )}
                                <Table.Cell>
                                  <Text fontSize="sm">{subtask.originalEstimate || '-'}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge 
                                    size="sm"
                                    colorPalette={STATE_COLORS[subtask.state] || 'gray'}
                                    cursor="pointer"
                                    title="Click to cycle through states"
                                  >
                                    {STATE_TEXT[subtask.state] || subtask.state}
                                  </Badge>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </Box>
                  )}

                  {/* Create button */}
                  <Flex justify="center" mt={6}>
                    <Button
                      colorPalette="green"
                      size="lg"
                      disabled={parseResult.errors.length > 0 || parseResult.subtasks.length === 0 || isCreating || (!isMultiEpicMode && !currentEpic)}
                      onClick={handleCreateSubtasks}
                    >
                      {isCreating ? (
                        <Flex align="center" gap={2}>
                          <Spinner size="sm" />
                          Creating {parseResult.subtasks.length} Subtasks in Bulk...
                        </Flex>
                      ) : (
                        `🚀 Create ${parseResult.subtasks.length} Subtasks (Bulk API)`
                      )}
                    </Button>
                  </Flex>

                  {/* Create Error */}
                  {createError && (
                    <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200" mt={4}>
                      <Text color="red.800" fontWeight="medium">
                        ❌ Creation Error: {createError}
                      </Text>
                    </Box>
                  )}

                  {/* Bulk Creation Results */}
                  {bulkResult && (
                    <Box mt={6}>
                      <Text fontWeight="medium" mb={3}>📊 Bulk Creation Results</Text>
                      <Stack gap={4}>
                        {/* Overall Summary */}
                        <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                          <Flex justify="space-between" align="center" mb={2}>
                            <Text color="blue.800" fontWeight="medium">
                              📋 Total Processed: {bulkResult.totalProcessed}
                            </Text>
                            <Flex gap={2}>
                              <Badge colorPalette="green" size="sm">
                                ✅ {bulkResult.totalSuccessful}
                              </Badge>
                              {bulkResult.totalFailed > 0 && (
                                <Badge colorPalette="red" size="sm">
                                  ❌ {bulkResult.totalFailed}
                                </Badge>
                              )}
                            </Flex>
                          </Flex>
                          <Text fontSize="sm" color="blue.700">
                            {bulkResult.totalSuccessful > 0 && bulkResult.totalFailed === 0 
                              ? "🎉 All subtasks created successfully!" 
                              : bulkResult.totalSuccessful > 0 
                                ? `✅ ${bulkResult.totalSuccessful} created, ❌ ${bulkResult.totalFailed} failed`
                                : "❌ No subtasks were created successfully"
                            }
                          </Text>
                        </Box>

                        {/* Success Details */}
                        {bulkResult.successful.length > 0 && (
                          <Box p={4} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                            <Text color="green.800" fontWeight="medium" mb={3}>
                              ✅ Successfully Created ({bulkResult.successful.length})
                            </Text>
                            <Stack gap={2}>
                              {bulkResult.successful.slice(0, 5).map((success, index) => (
                                <Flex key={index} justify="space-between" align="center" p={2} bg="white" borderRadius="md">
                                  <Text fontSize="sm" color="green.700" flex="1">
                                    {success.summary}
                                  </Text>
                                  <Badge colorPalette="blue" size="sm">
                                    {success.key}
                                  </Badge>
                                </Flex>
                              ))}
                              {bulkResult.successful.length > 5 && (
                                <Text fontSize="sm" color="green.600" fontStyle="italic">
                                  ... and {bulkResult.successful.length - 5} more subtasks created
                                </Text>
                              )}
                            </Stack>
                          </Box>
                        )}

                        {/* Failure Details */}
                        {bulkResult.failed.length > 0 && (
                          <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
                            <Text color="red.800" fontWeight="medium" mb={3}>
                              ❌ Failed to Create ({bulkResult.failed.length})
                            </Text>
                            <Stack gap={2}>
                              {bulkResult.failed.map((failure, index) => (
                                <Box key={index} p={3} bg="white" borderRadius="md" border="1px solid" borderColor="red.100">
                                  <Flex justify="space-between" align="start" mb={1}>
                                    <Text fontSize="sm" fontWeight="medium" color="red.700" flex="1">
                                      {failure.summary}
                                    </Text>
                                    <Badge colorPalette="red" size="sm">
                                      Row {failure.index + 1}
                                    </Badge>
                                  </Flex>
                                  <Stack gap={1}>
                                    {failure.error.split(';').map((errorMessage, errorIndex) => (
                                      <Text key={errorIndex} fontSize="xs" color="red.600">
                                        {errorMessage.trim()}
                                      </Text>
                                    ))}
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}

                        {/* Next Steps */}
                        <Box p={4} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.200">
                          <Text color="purple.800" fontWeight="medium" mb={2}>
                            � Next Steps
                          </Text>
                          <Stack gap={2}>
                            {bulkResult.totalSuccessful > 0 && (
                              <Text fontSize="sm" color="purple.700">
                                • View your new subtasks in the epic: {currentEpic?.key}
                              </Text>
                            )}
                            {bulkResult.totalFailed > 0 && (
                              <Text fontSize="sm" color="purple.700">
                                • Fix errors in template and retry failed subtasks
                              </Text>
                            )}
                            <Text fontSize="sm" color="purple.700">
                              • Return to epic page to see progress and manage subtasks
                            </Text>
                          </Stack>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Action Buttons */}
          <Flex gap={4} justify="flex-end" mt={6}>
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Back to Epic
            </Button>
          </Flex>
        </Stack>
      </Box>

      {/* Flash Footer */}
      <Box textAlign="center" mt={12}>
        <Text color="rgba(0, 0, 0, 0.8)" fontSize="sm">
          Flash is preparing your templates... slowly but surely! 🦥
        </Text>
      </Box>
    </Box>
  )
}

export default function AddSubTaskByTemplatePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AddSubTaskByTemplateContent />
    </Suspense>
  )
}