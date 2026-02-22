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
  { header: 'Event Name', key: 'venueName' },
  { header: 'Brand', key: 'brand' },
  { header: 'Start Time', key: 'startTime' },
  { header: 'End Time', key: 'endTime' },
  { header: 'Products', key: 'products' },
  { header: 'Discount?', key: 'discount' },
]

// Event List columns - ordered alphabetically: non-location fields first, then location fields alphabetically
// These column names must exactly match what CSVUploadModal expects for re-import compatibility
const eventListColumns: ReportColumn[] = [
  // Non-location fields (alphabetical)
  { header: 'Brand Description', key: 'brandDescription' },
  { header: 'Brand Name', key: 'brandName' },
  { header: 'Category', key: 'category' },
  { header: 'Check-in Code', key: 'checkInCode' },
  { header: 'Date', key: 'date' },
  { header: 'Discount', key: 'discount' },
  { header: 'Discount Image URL', key: 'discountImageURL' },
  { header: 'Discount Link', key: 'discountLink' },
  { header: 'End Time', key: 'endTime' },
  { header: 'Event Info', key: 'eventInfo' },
  { header: 'Event Name', key: 'name' },
  { header: 'Products', key: 'products' },
  { header: 'Review Points', key: 'reviewPoints' },
  { header: 'Start Time', key: 'startTime' },
  { header: 'Points', key: 'checkInPoints' },
  // Location fields (alphabetical)
  { header: 'Address', key: 'address' },
  { header: 'City', key: 'city' },
  { header: 'Latitude', key: 'latitude' },
  { header: 'Longitude', key: 'longitude' },
  { header: 'State', key: 'state' },
  { header: 'Zip Code', key: 'zipCode' },
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

// Helper function to format date for display (MM/DD/YYYY)
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

// Helper function to format date for CSV upload (YYYY-MM-DD)
const formatDateForUpload = (dateStr?: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to format time for display (12-hour with AM/PM)
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

// Helper function to format time for CSV upload (24-hour HH:MM format)
const formatTimeForUpload = (timeStr?: string): string => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// Helper function to convert products array to string
const formatProducts = (products?: string[]): string => {
  if (!products || !Array.isArray(products)) return ''
  return products.join(', ')
}

// Appwrite listDocuments returns max 25 by default. Fetch all users in pages for report consistency.
const REPORT_USERS_PAGE_SIZE = 100

async function fetchAllAppUsers(): Promise<AppUser[]> {
  const all: AppUser[] = []
  let offset = 0
  let chunk: AppUser[]
  do {
    chunk = await appUsersService.list([
      Query.orderDesc('$createdAt'),
      Query.limit(REPORT_USERS_PAGE_SIZE),
      Query.offset(offset),
    ])
    all.push(...chunk)
    offset += REPORT_USERS_PAGE_SIZE
  } while (chunk.length === REPORT_USERS_PAGE_SIZE)
  return all
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

        const hasDiscount = (event.discount != null && String(event.discount).trim() !== '') ||
          (event.discountImageURL != null && String(event.discountImageURL).trim() !== '')
        return {
          date: formatDate(event.date),
          venueName: event.name || '',
          brand: brandName,
          startTime: formatTime(event.startTime),
          endTime: formatTime(event.endTime),
          products: formatProducts(event.products),
          discount: hasDiscount ? 'YES' : 'NO',
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

        // Extract latitude and longitude from location array [longitude, latitude]
        let latitude = ''
        let longitude = ''
        if (event.location && Array.isArray(event.location) && event.location.length === 2) {
          longitude = event.location[0]?.toString() || ''
          latitude = event.location[1]?.toString() || ''
        }
        
        // Get discount link if available (not in standard schema but may be in record)
        const eventRecord = event as Record<string, unknown>
        const discountLink = (eventRecord.discountLink as string) || ''
        
        return {
          name: event.name || '',
          date: formatDateForUpload(event.date),
          startTime: formatTimeForUpload(event.startTime),
          endTime: formatTimeForUpload(event.endTime),
          category: event.categories || '',
          brandName: brandName,
          brandDescription: event.brandDescription || '',
          products: formatProducts(event.products),
          discount: event.discount?.toString() || '',
          discountImageURL: event.discountImageURL || '',
          discountLink: discountLink,
          checkInCode: event.checkInCode || '',
          checkInPoints: event.checkInPoints?.toString() || '0',
          reviewPoints: event.reviewPoints?.toString() || '0',
          eventInfo: event.eventInfo || '',
          address: event.address || '',
          city: event.city || '',
          state: event.state || '',
          zipCode: event.zipCode || '',
          latitude: latitude,
          longitude: longitude,
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
        productType: formatProducts(client.productType),
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
   * Fetches all users (paginated) so report total matches actual user count.
   */
  async generateAppUsersReport(): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const usersResult = await fetchAllAppUsers()

    const rows = usersResult.map((user: AppUser) => {
      const userRecord = user as Record<string, unknown>
      
      // Map user_profiles fields to report columns
      // totalPoints = total points earned by user
      // totalReviews = number of reviews submitted
      // totalEvents = number of check-ins (events attended)
      // isAmbassador = BA Badge status
      // isInfluencer = Influencer Badge status
      const totalPoints = (userRecord.totalPoints as number) ?? (userRecord.userPoints as number) ?? 0
      const totalReviews = (userRecord.totalReviews as number) ?? (userRecord.reviews as number) ?? 0
      const totalEvents = (userRecord.totalEvents as number) ?? (userRecord.checkIns as number) ?? 0
      const isAmbassador = (userRecord.isAmbassador as boolean) ?? (userRecord.baBadge as boolean) ?? false
      const isInfluencer = (userRecord.isInfluencer as boolean) ?? (userRecord.influencerBadge as boolean) ?? false
      const checkInReviewPoints = (userRecord.checkInReviewPoints as number) ?? 0
      const triviasWon = (userRecord.triviasWon as number) ?? 0
      
      // Determine tier level based on totalPoints if not explicitly set
      let tierLevel = (userRecord.tierLevel as string) || ''
      if (!tierLevel && totalPoints > 0) {
        if (totalPoints >= 1000) tierLevel = 'ProSampler'
        else if (totalPoints >= 500) tierLevel = 'Sampler'
        else tierLevel = 'NewbieSampler'
      } else if (!tierLevel) {
        tierLevel = 'NewbieSampler'
      }
      
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: (userRecord.username as string) || '',
        email: user.email || '',
        dob: formatDate(userRecord.dob as string | undefined),
        signUpDate: formatDate(user.$createdAt),
        lastLoginDate: formatDate(user.lastLoginDate),
        referralCode: (userRecord.referralCode as string) || '',
        userPoints: totalPoints.toString(),
        checkInReviewPoints: checkInReviewPoints.toString(),
        baBadge: isAmbassador ? 'Yes' : 'No',
        influencerBadge: isInfluencer ? 'Yes' : 'No',
        tierLevel: tierLevel,
        checkIns: totalEvents.toString(),
        reviews: totalReviews.toString(),
        triviasWon: triviasWon.toString(),
      }
    })

    return {
      columns: appUsersColumns,
      rows,
    }
  },

  /**
   * Generate Points Earned report
   * Fetches all users (paginated) so report total matches actual user count.
   */
  async generatePointsEarnedReport(): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const usersResult = await fetchAllAppUsers()

    const rows = usersResult.map((user: AppUser) => {
      const userRecord = user as Record<string, unknown>
      
      // Map user_profiles fields - totalPoints is the main field for user points
      const totalPoints = (userRecord.totalPoints as number) ?? (userRecord.userPoints as number) ?? 0
      const checkInReviewPoints = (userRecord.checkInReviewPoints as number) ?? 0
      
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: (userRecord.username as string) || '',
        userPoints: totalPoints.toString(),
        checkInReviewPoints: checkInReviewPoints.toString(),
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
