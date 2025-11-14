import ExcelJS from 'exceljs'
import { JiraEpic } from './jiraFetchers'

export interface ExcelExportOptions {
  filename?: string
  includeSubtasks?: boolean
  sheetName?: string
}

interface SubtaskData {
  id: string
  key: string
  summary: string
  status: { name: string }
  assignee?: { displayName: string }
  created?: string
  updated?: string
}

export interface ParsedSubtask {
  summary: string
  description: string
  componentId: string
  productId: string
  typeOfWork: string
  plannedStart: string
  dueDate: string
  originalEstimate: string
  remainingEstimate: string
  assignee: string
  reporter: string
  epicKey?: string  // Optional for backward compatibility
  priority: string
  state: 'idle' | 'uploading' | 'complete' | 'error'
  row?: number // For error tracking
}

export interface ParseResult {
  subtasks: ParsedSubtask[]
  errors: Array<{ row: number; field: string; message: string }>
  totalRows: number
}

export class ExcelService {
  /**
   * Export epic data to Excel file
   */
  static async exportEpicToExcel(
    epic: JiraEpic, 
    options: ExcelExportOptions = {}
  ): Promise<Uint8Array> {
    const {
      includeSubtasks = true,
      sheetName = 'Epic Details'
    } = options

    // Create a new workbook
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Jira Flash'
    workbook.lastModifiedBy = 'Jira Flash'
    workbook.created = new Date()
    workbook.modified = new Date()

    // Create the main epic sheet
    const epicSheet = workbook.addWorksheet(sheetName)
    await this.createEpicSheet(epicSheet, epic)

    // Create subtasks sheet if requested
    if (includeSubtasks && epic.subtasks.length > 0) {
      const subtasksSheet = workbook.addWorksheet('Subtasks')
      await this.createSubtasksSheet(subtasksSheet, epic.subtasks)
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return new Uint8Array(buffer as ArrayBuffer)
  }

  /**
   * Create and format the epic details sheet
   */
  private static async createEpicSheet(worksheet: ExcelJS.Worksheet, epic: JiraEpic) {
    // Set column widths
    worksheet.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 50 }
    ]

    // Add title
    worksheet.mergeCells('A1:B1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = `Epic: ${epic.key}`
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

    // Add epic data
    const epicData = [
      { field: 'Key', value: epic.key },
      { field: 'Summary', value: epic.summary },
      { field: 'Description', value: epic.description || 'N/A' },
      { field: 'Status', value: epic.status.name },
      { field: 'Priority', value: epic.priority.name },
      { field: 'Assignee', value: epic.assignee?.displayName || 'Unassigned' },
      { field: 'Reporter', value: epic.reporter?.displayName || 'N/A' },
      { field: 'Story Points', value: epic.storyPoints || 'Not set' },
      { field: 'Project', value: `${epic.project.name} (${epic.project.key})` },
      { field: 'Created', value: new Date(epic.created).toLocaleDateString() },
      { field: 'Updated', value: new Date(epic.updated).toLocaleDateString() },
      { field: 'Total Subtasks', value: epic.subtasks.length.toString() }
    ]

    // Add data rows starting from row 3
    epicData.forEach((row, index) => {
      const rowNumber = index + 3
      const fieldCell = worksheet.getCell(`A${rowNumber}`)
      const valueCell = worksheet.getCell(`B${rowNumber}`)
      
      fieldCell.value = row.field
      fieldCell.font = { bold: true }
      fieldCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }
      
      valueCell.value = row.value
    })

    // Add borders to all cells with proper range iteration
    for (let row = 1; row <= epicData.length + 2; row++) {
      for (let col = 1; col <= 2; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    }
  }

  /**
   * Create and format the subtasks sheet
   */
  private static async createSubtasksSheet(worksheet: ExcelJS.Worksheet, subtasks: SubtaskData[]) {
    // Set column definitions
    worksheet.columns = [
      { header: 'Key', key: 'key', width: 15 },
      { header: 'Summary', key: 'summary', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assignee', key: 'assignee', width: 20 },
      { header: 'Created', key: 'created', width: 12 },
      { header: 'Updated', key: 'updated', width: 12 }
    ]

    // Style the header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Add subtask data
    subtasks.forEach((subtask, index) => {
      const row = worksheet.getRow(index + 2)
      row.values = {
        key: subtask.key,
        summary: subtask.summary,
        status: subtask.status.name,
        assignee: subtask.assignee?.displayName || 'Unassigned',
        created: subtask.created ? new Date(subtask.created).toLocaleDateString() : 'N/A',
        updated: subtask.updated ? new Date(subtask.updated).toLocaleDateString() : 'N/A'
      }

      // Alternate row colors
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } }
      }
    })

    // Add borders to all data
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= subtasks.length + 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })
      }
    })
  }

  /**
   * Download Excel file in browser
   */
  static downloadExcelFile(buffer: Uint8Array, filename: string) {
    const blob = new Blob([buffer as unknown as BlobPart], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  /**
   * Create a template Excel file for subtask import
   */
  static async createSubtaskTemplate(
    components?: Array<{ id: string; name: string }>,
    products?: Array<{ id: string; name: string }>,
    typesOfWork?: Array<{ id: string; name: string }>,
    currentUserName?: string,
    epicAssigneeEmail?: string,
    epicReporterEmail?: string,
    isMultiEpic?: boolean
  ): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook()
    
    // Utility function to extract username from email address
    const extractUsernameFromEmail = (emailAddress: string): string => {
      if (!emailAddress) return ''
      // Split by space and take the first element to get the username part
      // e.g., "john at fpt dot com" -> ["john", "at", "fpt", "dot", "com"] -> "john"
      const parts = emailAddress.split(' ')
      return parts[0] || ''
    }
    
    // Create main template sheet FIRST
    const worksheet = workbook.addWorksheet('Subtask Template')

    // Define template columns based on mode
    const baseColumns = [
      { header: 'Summary*', key: 'summary', width: 40 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Component ID*', key: 'componentId', width: 15 },
      { header: 'Product ID*', key: 'productId', width: 15 },
      { header: 'Type of Work*', key: 'typeOfWork', width: 15 },
      { header: 'Planned Start*', key: 'plannedStart', width: 20 },
      { header: 'Due Date*', key: 'dueDate', width: 15 },
      { header: 'Original Estimate*', key: 'originalEstimate', width: 18 },
      { header: 'Remaining Estimate*', key: 'remainingEstimate', width: 18 },
      { header: 'Assignee', key: 'assignee', width: 20 },
      { header: 'Reporter', key: 'reporter', width: 20 }
    ]

    // Add Epic Key column only for multi-epic mode
    const columns = isMultiEpic 
      ? [...baseColumns, { header: 'Epic Key*', key: 'epicKey', width: 20 }]
      : [...baseColumns]

    worksheet.columns = columns

    // Style header
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } }

    // Add example rows with empty summary, description, type of work
    // Use epic assignee/reporter if available, otherwise fall back to current user
    const epicAssigneeUsername = epicAssigneeEmail ? extractUsernameFromEmail(epicAssigneeEmail) : ''
    const epicReporterUsername = epicReporterEmail ? extractUsernameFromEmail(epicReporterEmail) : ''
    
    const defaultAssignee = epicAssigneeUsername || currentUserName || 'john.doe'
    const defaultReporter = epicReporterUsername || currentUserName || 'john.doe'
    
    const baseRowData = {
      summary: '', // Empty as requested
      description: '', // Empty as requested
      componentId: '10000',
      productId: '3883580',
      typeOfWork: '', // Empty as requested
      plannedStart: '2025-10-29T09:00',
      dueDate: '2025-10-30',
      originalEstimate: '8h',
      remainingEstimate: '8h',
      assignee: defaultAssignee, // User name as requested
      reporter: defaultReporter // User name as reporter
    }

    // Add epic key for multi-epic mode
    const firstRowData = isMultiEpic 
      ? { ...baseRowData, epicKey: 'EPIC-123' }
      : baseRowData
    
    worksheet.addRow(firstRowData)

    // Add a second example row
    const secondBaseRowData = {
      summary: '', // Empty as requested
      description: '', // Empty as requested
      componentId: '10001',
      productId: '3883581',
      typeOfWork: '', // Empty as requested
      plannedStart: '2025-10-30T09:00',
      dueDate: '2025-10-31',
      originalEstimate: '4h',
      remainingEstimate: '4h',
      assignee: defaultAssignee, // User name as requested
      reporter: defaultReporter // User name as reporter
    }

    const secondRowData = isMultiEpic 
      ? { ...secondBaseRowData, epicKey: 'EPIC-456' }
      : secondBaseRowData
    
    worksheet.addRow(secondRowData)

    // Add instructions
    worksheet.addRow({})
    worksheet.addRow(['Instructions:'])
    worksheet.addRow(['- Fields marked with * are required'])
    worksheet.addRow(['- Fill in Summary, Description, and Type of Work for each subtask'])
    worksheet.addRow(['- Use Component IDs from the Components sheet'])
    worksheet.addRow(['- Use Product IDs from the Products sheet'])
    worksheet.addRow(['- Use Type of Work values from the Types of Work sheet'])
    if (isMultiEpic) {
      worksheet.addRow(['- Epic Key: Specify the epic key for each subtask (e.g., EPIC-123)'])
      worksheet.addRow(['- Each subtask can belong to a different epic'])
    }
    worksheet.addRow(['- Use format "YYYY-MM-DDTHH:mm" for Planned Start'])
    worksheet.addRow(['- Use format "YYYY-MM-DD" for Due Date'])
    worksheet.addRow(['- Time estimates: 8h, 2d, 1w 3d, etc.'])
    worksheet.addRow(['- Assignee defaults to epic assignee, then your username, but can be changed'])
    worksheet.addRow(['- Reporter defaults to epic reporter, then your username, but can be changed'])

    // Create Components sheet SECOND
    const componentsSheet = workbook.addWorksheet('Components')
    componentsSheet.columns = [
      { header: 'Component ID', key: 'id', width: 15 },
      { header: 'Component Name', key: 'name', width: 30 }
    ]
    
    // Style components header
    const componentsHeaderRow = componentsSheet.getRow(1)
    componentsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    componentsHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f4e79' } }
    
    // Add components data
    if (components && components.length > 0) {
      components.forEach(component => {
        componentsSheet.addRow({
          id: component.id,
          name: component.name
        })
      })
    } else {
      // Add example data if no components provided
      componentsSheet.addRow({ id: '10000', name: 'Frontend' })
      componentsSheet.addRow({ id: '10001', name: 'Backend' })
      componentsSheet.addRow({ id: '10002', name: 'Database' })
    }

    // Create Products sheet THIRD
    const productsSheet = workbook.addWorksheet('Products')
    productsSheet.columns = [
      { header: 'Product ID', key: 'id', width: 15 },
      { header: 'Product Name', key: 'name', width: 30 }
    ]
    
    // Style products header
    const productsHeaderRow = productsSheet.getRow(1)
    productsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    productsHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70ad47' } }
    
    // Add products data
    if (products && products.length > 0) {
      products.forEach(product => {
        productsSheet.addRow({
          id: product.id,
          name: product.name
        })
      })
    } else {
      // Add example data if no products provided
      productsSheet.addRow({ id: '3883580', name: 'Web Application' })
      productsSheet.addRow({ id: '3883581', name: 'Mobile App' })
      productsSheet.addRow({ id: '3883582', name: 'API Service' })
    }

    // Create Types of Work sheet FOURTH
    const typesOfWorkSheet = workbook.addWorksheet('Types of Work')
    typesOfWorkSheet.columns = [
      { header: 'Type ID', key: 'id', width: 15 },
      { header: 'Type Name', key: 'name', width: 30 }
    ]
    
    // Style types of work header
    const typesOfWorkHeaderRow = typesOfWorkSheet.getRow(1)
    typesOfWorkHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    typesOfWorkHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff6600' } }
    
    // Add types of work data
    if (typesOfWork && typesOfWork.length > 0) {
      typesOfWork.forEach(type => {
        typesOfWorkSheet.addRow({
          id: type.id,
          name: type.name
        })
      })
    } else {
      // Add example data if no types of work provided
      typesOfWorkSheet.addRow({ id: 'Create', name: 'Create' })
      typesOfWorkSheet.addRow({ id: 'Update', name: 'Update' })
      typesOfWorkSheet.addRow({ id: 'Fix', name: 'Fix' })
      typesOfWorkSheet.addRow({ id: 'Test', name: 'Test' })
      typesOfWorkSheet.addRow({ id: 'Research', name: 'Research' })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new Uint8Array(buffer as ArrayBuffer)
  }

  /**
   * Parse uploaded Excel template and validate subtask data
   */
  static async parseSubtaskTemplate(file: File): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook()
    
    try {
      // Read the uploaded file
      const arrayBuffer = await file.arrayBuffer()
      await workbook.xlsx.load(arrayBuffer)
      
      // Get the first worksheet
      const worksheet = workbook.getWorksheet(1)
      if (!worksheet) {
        throw new Error('No worksheet found in the uploaded file')
      }

      const subtasks: ParsedSubtask[] = []
      const errors: Array<{ row: number; field: string; message: string }> = []
      let totalRows = 0
      let shouldContinueProcessing = true

      // Find the data starting row (after headers)
      const dataStartRow = 2 // Assuming row 1 is headers
      
      // Process each row starting from dataStartRow
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber < dataStartRow || !shouldContinueProcessing) return
        
        // Extract values from each column based on template structure
        const summary = this.getCellValue(row, 1) // Column A
        
        // Stop processing when we reach the Instructions section
        if (summary === 'Instructions:') {
          shouldContinueProcessing = false
          return
        }
        
        totalRows++
        
        const description = this.getCellValue(row, 2) // Column B
        const componentId = this.getCellValue(row, 3) // Column C
        const productId = this.getCellValue(row, 4) // Column D
        const typeOfWork = this.getCellValue(row, 5) // Column E
        const plannedStart = this.getCellValue(row, 6) // Column F
        const dueDate = this.getCellValue(row, 7) // Column G
        const originalEstimate = this.getCellValue(row, 8) // Column H
        const remainingEstimate = this.getCellValue(row, 9) // Column I
        const assignee = this.getCellValue(row, 10) // Column J
        const reporter = this.getCellValue(row, 11) // Column K
        
        // Check if we have a 12th column (Epic Key for multi-epic mode)
        const totalColumns = row.cellCount
        const epicKey = totalColumns >= 12 ? this.getCellValue(row, 12) : null // Column L
        const priority = totalColumns >= 13 ? this.getCellValue(row, 13) : (totalColumns >= 12 ? null : this.getCellValue(row, 12)) // Adjust priority column

        // Validate required fields
        if (!summary || summary.trim() === '') {
          errors.push({
            row: rowNumber,
            field: 'Summary',
            message: 'Summary is required'
          })
          return
        }

        // Validate date formats
        if (plannedStart && !this.isValidDateTime(plannedStart)) {
          errors.push({
            row: rowNumber,
            field: 'Planned Start',
            message: 'Invalid date format. Use YYYY-MM-DDTHH:mm'
          })
        }

        if (dueDate && !this.isValidDate(dueDate)) {
          errors.push({
            row: rowNumber,
            field: 'Due Date',
            message: 'Invalid date format. Use YYYY-MM-DD'
          })
        }

        // Validate time estimates
        if (originalEstimate && !this.isValidTimeEstimate(originalEstimate)) {
          errors.push({
            row: rowNumber,
            field: 'Original Estimate',
            message: 'Invalid time format. Use 8h, 2d, 1w 3d, etc.'
          })
        }

        if (remainingEstimate && !this.isValidTimeEstimate(remainingEstimate)) {
          errors.push({
            row: rowNumber,
            field: 'Remaining Estimate',
            message: 'Invalid time format. Use 8h, 2d, 1w 3d, etc.'
          })
        }

        // Create the parsed subtask
        const parsedSubtask: ParsedSubtask = {
          summary: summary.trim(),
          description: description?.trim() || '',
          componentId: componentId?.trim() || '',
          productId: productId?.trim() || '',
          typeOfWork: typeOfWork?.trim() || '',
          plannedStart: plannedStart?.trim() || '',
          dueDate: dueDate?.trim() || '',
          originalEstimate: originalEstimate?.trim() || '',
          remainingEstimate: remainingEstimate?.trim() || '',
          assignee: assignee?.trim() || '',
          reporter: reporter?.trim() || '',
          epicKey: epicKey?.trim() || undefined, // Epic key for multi-epic mode
          priority: priority?.trim() || '',
          state: 'idle', // Default state when first parsed
          row: rowNumber
        }

        subtasks.push(parsedSubtask)
      })

      return {
        subtasks,
        errors,
        totalRows
      }

    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Helper method to get cell value as string
   */
  private static getCellValue(row: ExcelJS.Row, columnNumber: number): string | null {
    const cell = row.getCell(columnNumber)
    if (!cell || cell.value === null || cell.value === undefined) {
      return null
    }
    return String(cell.value).trim()
  }

  /**
   * Validate date-time format (YYYY-MM-DDTHH:mm)
   */
  private static isValidDateTime(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
    if (!regex.test(dateString)) return false
    
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) return false
    
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  /**
   * Validate time estimate format (8h, 2d, 1w 3d, etc.)
   */
  private static isValidTimeEstimate(estimate: string): boolean {
    const regex = /^(\d+[wdhm]\s?)+$/
    return regex.test(estimate.replace(/\s/g, ''))
  }
}