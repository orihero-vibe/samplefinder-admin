import { eventsService, clientsService, appUsersService } from './services'
import type { EventDocument, ClientDocument, AppUser } from './services'
import { Query } from './appwrite'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Report type definitions matching the requirements from the image
export type ReportType = 
  | 'dashboard-all'
  | 'dashboard-date-range'
  | 'event-list'
  | 'clients-brands'
  | 'app-users'
  | 'points-earned-all'

export interface ReportColumn {
  header: string
  key: string
  getValue?: (row: Record<string, string | number>) => string | number
}

// Dashboard (All) columns
const dashboardColumns: ReportColumn[] = [
  { header: 'Date', key: 'date' },
  { header: 'Venue Name', key: 'venueName' },
  { header: 'Brand', key: 'brand' },
  { header: 'Start Time', key: 'startTime' },
  { header: 'End Time', key: 'endTime' },
  { header: 'Product Type', key: 'productType' },
  { header: 'Discount?', key: 'discount' },
]

// Event List columns
const eventListColumns: ReportColumn[] = [
  { header: 'Event Name', key: 'name' },
  { header: 'Brand Name', key: 'brandName' },
  { header: 'Event Date', key: 'date' },
  { header: 'Start Time', key: 'startTime' },
  { header: 'End Time', key: 'endTime' },
  { header: 'Address', key: 'address' },
  { header: 'City', key: 'city' },
  { header: 'State', key: 'state' },
  { header: 'Zip', key: 'zipCode' },
  { header: 'Product Type', key: 'productType' },
  { header: 'Product 1', key: 'product1' },
  { header: 'Product 2', key: 'product2' },
  { header: 'Product 3', key: 'product3' },
  { header: 'Event Info', key: 'eventInfo' },
  { header: 'Discount Text', key: 'discountText' },
  { header: 'Discount Image File?', key: 'discountImageFile' },
  { header: 'Check-In Code', key: 'checkInCode' },
  { header: 'Check-in Points', key: 'checkInPoints' },
  { header: 'Review Points', key: 'reviewPoints' },
]

// Clients & Brands columns
const clientsBrandsColumns: ReportColumn[] = [
  { header: 'Client Name', key: 'name' },
  { header: 'Client Logo File?', key: 'logoFile' },
  { header: 'Signup Date', key: 'signupDate' },
  { header: 'Product Type', key: 'productType' },
  { header: '# of Favorites', key: 'favorites' },
]

// App Users columns
const appUsersColumns: ReportColumn[] = [
  { header: 'First Name', key: 'firstName' },
  { header: 'Last Name', key: 'lastName' },
  { header: 'Username', key: 'username' },
  { header: 'Email', key: 'email' },
  { header: 'DOB', key: 'dob' },
  { header: 'Sign-Up Date', key: 'signUpDate' },
  { header: 'Last Login Date', key: 'lastLoginDate' },
  { header: 'Password', key: 'password' },
  { header: 'Referral Code', key: 'referralCode' },
  { header: 'User Points', key: 'userPoints' },
  { header: 'Check-in/Review Pts', key: 'checkInReviewPoints' },
  { header: 'BA Badge (Yes/No)', key: 'baBadge' },
  { header: 'Influencer Badge (Yes/No)', key: 'influencerBadge' },
  { header: 'Tier Level', key: 'tierLevel' },
  { header: 'Check-Ins', key: 'checkIns' },
  { header: 'Reviews', key: 'reviews' },
  { header: 'Trivias Won', key: 'triviasWon' },
]

// Points Earned (All) columns
const pointsEarnedColumns: ReportColumn[] = [
  { header: 'First Name', key: 'firstName' },
  { header: 'Last Name', key: 'lastName' },
  { header: 'Username', key: 'username' },
  { header: 'User Points', key: 'userPoints' },
  { header: 'Check-in/Review Pts', key: 'checkInReviewPoints' },
]

// Helper function to format date
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

// Helper function to format time
const formatTime = (timeStr?: string): string => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return ''
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
}

// Helper function to convert product types array to string
const formatProductTypes = (productTypes?: string[]): string => {
  if (!productTypes || !Array.isArray(productTypes)) return ''
  return productTypes.join(', ')
}

// Export Service
export const exportService = {
  /**
   * Generate report data based on report type
   */
  async generateReportData(
    reportType: ReportType,
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    switch (reportType) {
      case 'dashboard-all':
      case 'dashboard-date-range':
        return await this.generateDashboardReport(dateRange)
      
      case 'event-list':
        return await this.generateEventListReport()
      
      case 'clients-brands':
        return await this.generateClientsBrandsReport()
      
      case 'app-users':
        return await this.generateAppUsersReport()
      
      case 'points-earned-all':
        return await this.generatePointsEarnedReport()
      
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }
  },

  /**
   * Generate Dashboard report
   */
  async generateDashboardReport(
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const queries: string[] = [
      Query.equal('isArchived', false), // Only active events
      Query.orderDesc('date'),
    ]

    // Apply date range filter if provided
    if (dateRange?.start) {
      queries.push(Query.greaterThanEqual('date', dateRange.start.toISOString()))
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      queries.push(Query.lessThanEqual('date', endDate.toISOString()))
    }

    const eventsResult = await eventsService.list(queries)
    
    // Map events to report rows
    const rows = await Promise.all(
      eventsResult.documents.map(async (event: EventDocument) => {
        let brandName = ''
        if (event.client) {
          try {
            const client = await clientsService.getById(event.client)
            brandName = client.name || ''
          } catch (err) {
            console.error('Error fetching client for event:', err)
          }
        }

        return {
          date: formatDate(event.date),
          venueName: event.name || '',
          brand: brandName,
          startTime: formatTime(event.startTime),
          endTime: formatTime(event.endTime),
          productType: formatProductTypes(event.productType),
          discount: event.discount && event.discount > 0 ? 'YES' : 'NO',
        }
      })
    )

    return {
      columns: dashboardColumns,
      rows,
    }
  },

  /**
   * Generate Event List report
   */
  async generateEventListReport(): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const queries: string[] = [
      Query.equal('isArchived', false),
      Query.orderDesc('date'),
    ]

    const eventsResult = await eventsService.list(queries)
    
    // Map events to report rows
    const rows = await Promise.all(
      eventsResult.documents.map(async (event: EventDocument) => {
        let brandName = ''
        if (event.client) {
          try {
            const client = await clientsService.getById(event.client)
            brandName = client.name || ''
          } catch (err) {
            console.error('Error fetching client for event:', err)
          }
        }

        // Parse products (comma-separated string)
        const products = event.products ? event.products.split(',').map(p => p.trim()) : []
        
        return {
          name: event.name || '',
          brandName: brandName,
          date: formatDate(event.date),
          startTime: formatTime(event.startTime),
          endTime: formatTime(event.endTime),
          address: event.address || '',
          city: event.city || '',
          state: event.state || '',
          zipCode: event.zipCode || '',
          productType: formatProductTypes(event.productType),
          product1: products[0] || '',
          product2: products[1] || '',
          product3: products[2] || '',
          eventInfo: event.eventInfo || '',
          discountText: event.discount && event.discount > 0 ? `${event.discount}% Off` : '',
          discountImageFile: event.discountImageURL ? 'Yes' : 'No',
          checkInCode: event.checkInCode || '',
          checkInPoints: event.checkInPoints?.toString() || '0',
          reviewPoints: event.reviewPoints?.toString() || '0',
        }
      })
    )

    return {
      columns: eventListColumns,
      rows,
    }
  },

  /**
   * Generate Clients & Brands report
   */
  async generateClientsBrandsReport(): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const clientsResult = await clientsService.list([Query.orderDesc('$createdAt')])
    
    const rows = clientsResult.documents.map((client: ClientDocument) => {
      return {
        name: client.name || '',
        logoFile: client.logoURL ? 'Yes' : 'No',
        signupDate: formatDate(client.$createdAt),
        productType: formatProductTypes(client.productType),
        favorites: '0', // TODO: Implement favorites count from events/user favorites
      }
    })

    return {
      columns: clientsBrandsColumns,
      rows,
    }
  },

  /**
   * Generate App Users report
   */
  async generateAppUsersReport(): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const usersResult = await appUsersService.list([Query.orderDesc('$createdAt')])
    
    const rows = usersResult.map((user: AppUser) => {
      const userRecord = user as Record<string, unknown>
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: (userRecord.username as string) || '',
        email: user.email || '',
        dob: formatDate(userRecord.dob as string | undefined),
        signUpDate: formatDate(user.$createdAt),
        lastLoginDate: '', // TODO: Implement last login tracking
        password: '********', // Never export actual passwords
        referralCode: (userRecord.referralCode as string) || '',
        userPoints: (userRecord.userPoints as number | undefined)?.toString() || '0',
        checkInReviewPoints: (userRecord.checkInReviewPoints as number | undefined)?.toString() || '0',
        baBadge: (userRecord.baBadge as boolean) ? 'Yes' : 'No',
        influencerBadge: (userRecord.influencerBadge as boolean) ? 'Yes' : 'No',
        tierLevel: (userRecord.tierLevel as string) || '',
        checkIns: (userRecord.checkIns as number | undefined)?.toString() || '0',
        reviews: (userRecord.reviews as number | undefined)?.toString() || '0',
        triviasWon: (userRecord.triviasWon as number | undefined)?.toString() || '0',
      }
    })

    return {
      columns: appUsersColumns,
      rows,
    }
  },

  /**
   * Generate Points Earned report
   */
  async generatePointsEarnedReport(): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    // Fetch all users without ordering by userPoints (since it may not be in schema)
    const usersResult = await appUsersService.list([
      Query.orderDesc('$createdAt'),
    ])
    
    const rows = usersResult.map((user: AppUser) => {
      const userRecord = user as Record<string, unknown>
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: (userRecord.username as string) || '',
        userPoints: (userRecord.userPoints as number | undefined)?.toString() || '0',
        checkInReviewPoints: (userRecord.checkInReviewPoints as number | undefined)?.toString() || '0',
      }
    })

    // Sort by userPoints on the client side (descending order)
    rows.sort((a, b) => {
      const aPoints = parseInt(a.userPoints as string) || 0
      const bPoints = parseInt(b.userPoints as string) || 0
      return bPoints - aPoints
    })

    return {
      columns: pointsEarnedColumns,
      rows,
    }
  },

  /**
   * Export data to CSV format
   */
  exportToCSV(columns: ReportColumn[], rows: Record<string, string | number>[]): string {
    // Create CSV header
    const header = columns.map(col => col.header).join(',')
    
    // Create CSV rows
    const csvRows = rows.map(row => {
      return columns.map(col => {
        const value = col.getValue ? col.getValue(row) : row[col.key]
        // Escape quotes and wrap in quotes if contains comma or quotes
        const stringValue = String(value ?? '')
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    })
    
    return [header, ...csvRows].join('\n')
  },

  /**
   * Download CSV file
   */
  downloadCSV(filename: string, csvContent: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  },

  /**
   * Export report to CSV and download
   */
  async exportReport(
    reportType: ReportType,
    filename: string,
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<void> {
    try {
      // Generate report data
      const { columns, rows } = await this.generateReportData(reportType, dateRange)
      
      // Convert to CSV
      const csvContent = this.exportToCSV(columns, rows)
      
      // Download CSV
      this.downloadCSV(filename, csvContent)
    } catch (error) {
      console.error('Error exporting report:', error)
      throw error
    }
  },

  /**
   * Export report to PDF
   */
  async exportReportToPDF(
    reportType: ReportType,
    filename: string,
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<void> {
    try {
      // Generate report data
      const { columns, rows } = await this.generateReportData(reportType, dateRange)
      
      // Create PDF document
      const doc = new jsPDF({
        orientation: columns.length > 8 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      
      // Add title
      const reportTitle = this.getReportTitle(reportType, dateRange)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(reportTitle, 14, 15)
      
      // Add generation date
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
      
      // Add date range if applicable
      if (dateRange && (dateRange.start || dateRange.end)) {
        const rangeText = `Date Range: ${dateRange.start ? formatDate(dateRange.start.toISOString()) : 'N/A'} - ${dateRange.end ? formatDate(dateRange.end.toISOString()) : 'N/A'}`
        doc.text(rangeText, 14, 28)
      }
      
      // Prepare table data
      const headers = columns.map(col => col.header)
      const tableRows = rows.map(row => 
        columns.map(col => {
          const value = col.getValue ? col.getValue(row) : row[col.key]
          return String(value ?? '')
        })
      )
      
      // Add table using autoTable
      autoTable(doc, {
        head: [headers],
        body: tableRows,
        startY: dateRange && (dateRange.start || dateRange.end) ? 32 : 28,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue-500
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // Gray-50
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer with page numbers
          const pageCount = doc.getNumberOfPages()
          const pageSize = doc.internal.pageSize
          const pageHeight = pageSize.height || pageSize.getHeight()
          
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageSize.width / 2,
            pageHeight - 10,
            { align: 'center' }
          )
        },
      })
      
      // Save the PDF
      doc.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw error
    }
  },

  /**
   * Get report title based on report type
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getReportTitle(reportType: ReportType, _dateRange?: { start: Date | null; end: Date | null }): string {
    switch (reportType) {
      case 'dashboard-all':
        return 'Dashboard Report - All Events'
      case 'dashboard-date-range':
        return 'Dashboard Report - Date Range'
      case 'event-list':
        return 'Event List Report'
      case 'clients-brands':
        return 'Clients & Brands Report'
      case 'app-users':
        return 'App Users Report'
      case 'points-earned-all':
        return 'Points Earned Report'
      default:
        return 'Report'
    }
  },
}
