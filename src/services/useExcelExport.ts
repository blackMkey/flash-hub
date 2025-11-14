import { useState } from 'react'
import { ExcelService, ParseResult } from './excelService'
import { JiraEpic, createSubtasksBulk, BulkCreateResult, fetchComponents, fetchDefectPatterns, fetchTypeOfWork, Component, DefectPattern, TypeOfWorkOption, fetchEpicParentKeys } from './jiraFetchers'

export const useExcelExport = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const exportEpicToExcel = async (epic: JiraEpic, options?: { includeSubtasks?: boolean }) => {
    try {
      setIsExporting(true)
      setExportError(null)

      const buffer = await ExcelService.exportEpicToExcel(epic, {
        includeSubtasks: options?.includeSubtasks ?? true
      })

      const filename = `Epic_${epic.key}_${new Date().toISOString().slice(0, 10)}.xlsx`
      ExcelService.downloadExcelFile(buffer, filename)

      return { success: true, filename }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export Excel file'
      setExportError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsExporting(false)
    }
  }

  const downloadSubtaskTemplate = async (
    projectId?: string, 
    issueId?: string, 
    issueKey?: string, 
    currentUserName?: string,
    epicAssigneeEmail?: string,
    epicReporterEmail?: string,
    isMultiEpic?: boolean
  ) => {
    try {
      setIsExporting(true)
      setExportError(null)

      let components: Component[] = []
      let products: DefectPattern[] = []
      let typesOfWork: TypeOfWorkOption[] = []

      // Fetch components if projectId is provided
      if (projectId) {
        try {
          components = await fetchComponents(projectId)
        } catch (error) {
          console.warn('Failed to fetch components:', error)
        }
      }

      // Fetch products if both issueId and projectId are provided
      if (issueId && projectId) {
        try {
          products = await fetchDefectPatterns(issueId, projectId)
        } catch (error) {
          console.warn('Failed to fetch products:', error)
        }
      }

      // Fetch types of work if both projectId and issueKey are provided
      if (projectId && issueKey) {
        try {
          typesOfWork = await fetchTypeOfWork(projectId, issueKey)
        } catch (error) {
          console.warn('Failed to fetch types of work:', error)
        }
      }

      const buffer = await ExcelService.createSubtaskTemplate(
        components,
        products.map(p => ({ id: p.value, name: p.label || p.value })),
        typesOfWork.map(t => ({ id: t.value, name: t.label })),
        currentUserName,
        epicAssigneeEmail,
        epicReporterEmail,
        isMultiEpic
      )
      const filename = `Subtask_Template_${new Date().toISOString().slice(0, 10)}.xlsx`
      ExcelService.downloadExcelFile(buffer, filename)

      return { success: true, filename }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create template'
      setExportError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsExporting(false)
    }
  }

  const parseSubtaskTemplate = async (file: File): Promise<ParseResult | null> => {
    try {
      setIsParsing(true)
      setParseError(null)

      const result = await ExcelService.parseSubtaskTemplate(file)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse template'
      setParseError(errorMessage)
      return null
    } finally {
      setIsParsing(false)
    }
  }

  const createBulkSubtasks = async (
    parentKey: string,
    projectKey: string,
    subtasksData: ParseResult['subtasks'],
    isMultiEpic: boolean = false
  ): Promise<BulkCreateResult | null> => {
    try {
      setIsCreating(true)
      setCreateError(null)

      // Check if this is multi-epic mode by looking for epic keys in the data
      const hasEpicKeys = subtasksData.some(subtask => subtask.epicKey && subtask.epicKey.trim() !== '')
      const actualIsMultiEpic = isMultiEpic || hasEpicKeys

      if (actualIsMultiEpic) {
        // Multi-epic mode: group subtasks by epic key
        const subtasksByEpic = new Map<string, ParseResult['subtasks']>()
        
        subtasksData.forEach(subtask => {
          const epicKey = subtask.epicKey?.trim() || parentKey // Fallback to provided parentKey
          if (!subtasksByEpic.has(epicKey)) {
            subtasksByEpic.set(epicKey, [])
          }
          subtasksByEpic.get(epicKey)!.push(subtask)
        })

        // Fetch parent keys for all epics
        const epicKeys = Array.from(subtasksByEpic.keys())
        const parentKeyMap = await fetchEpicParentKeys(epicKeys)

        // Create subtasks for each epic separately
        const allResults: BulkCreateResult[] = []
        
        for (const [epicKey, epicSubtasks] of subtasksByEpic.entries()) {
          const epicParentKey = parentKeyMap[epicKey] || epicKey
          
          // Convert subtasks to bulk format
          const bulkSubtasks = epicSubtasks.map(subtask => ({
            summary: subtask.summary,
            description: subtask.description || '',
            assignee: subtask.assignee || '',
            reporter: subtask.reporter || '',
            componentId: subtask.componentId,
            productId: subtask.productId,
            typeOfWork: subtask.typeOfWork,
            plannedStart: subtask.plannedStart,
            dueDate: subtask.dueDate,
            originalEstimate: subtask.originalEstimate,
            remainingEstimate: subtask.remainingEstimate || subtask.originalEstimate
          }))

          // Make API call for this epic's subtasks
          const epicResult = await createSubtasksBulk(epicParentKey, projectKey, bulkSubtasks)
          if (epicResult) {
            allResults.push(epicResult)
          }
        }

        // Combine all results
        const combinedResult: BulkCreateResult = {
          successful: allResults.flatMap(result => result.successful),
          failed: allResults.flatMap(result => result.failed),
          totalProcessed: allResults.reduce((sum, result) => sum + result.totalProcessed, 0),
          totalSuccessful: allResults.reduce((sum, result) => sum + result.totalSuccessful, 0),
          totalFailed: allResults.reduce((sum, result) => sum + result.totalFailed, 0)
        }

        return combinedResult
      } else {
        // Single epic mode: original logic
        const bulkSubtasks = subtasksData.map(subtask => ({
          summary: subtask.summary,
          description: subtask.description || '',
          assignee: subtask.assignee || '',
          reporter: subtask.reporter || '',
          componentId: subtask.componentId,
          productId: subtask.productId,
          typeOfWork: subtask.typeOfWork,
          plannedStart: subtask.plannedStart,
          dueDate: subtask.dueDate,
          originalEstimate: subtask.originalEstimate,
          remainingEstimate: subtask.remainingEstimate || subtask.originalEstimate
        }))

        const result = await createSubtasksBulk(parentKey, projectKey, bulkSubtasks)
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subtasks'
      setCreateError(errorMessage)
      return null
    } finally {
      setIsCreating(false)
    }
  }

  return {
    isExporting,
    exportError,
    isParsing,
    parseError,
    isCreating,
    createError,
    exportEpicToExcel,
    downloadSubtaskTemplate,
    parseSubtaskTemplate,
    createBulkSubtasks
  }
}