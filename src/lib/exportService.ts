import { eventsService, clientsService, appUsersService, categoriesService, reviewsService, triviaService, triviaResponsesService } from './services'
import type { EventDocument, ClientDocument, AppUser, TriviaDocument, TriviaResponseDocument, ReviewDocument } from './services'
import { Query } from './appwrite'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Normalize date range for filtering: single date => that full day; range => start through end of end day.
 * Future dates are allowed. Returns undefined when no start date.
 */
export function getEffectiveDateRange(
  dateRange: { start: Date | null; end: Date | null } | undefined
): { start: Date; end: Date } | undefined {
  if (!dateRange?.start) return undefined
  const start = new Date(dateRange.start)
  start.setHours(0, 0, 0, 0)
  const end = dateRange.end ? new Date(dateRange.end) : new Date(dateRange.start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Returns the current month as a date range (first day 00:00:00 through last day 23:59:59).
 * Used as the default range for Reports when nothing is selected.
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(year, month + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

// Report type definitions matching the requirements from the image
export type ReportType = 
  | 'dashboard-all'
  | 'dashboard-date-range'
  | 'event-list'
  | 'clients-brands'
  | 'app-users'
  | 'points-earned-all'
  | 'points-earned-date-range'

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
  { header: 'Tier Level', key: 'tierLevel' },
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

/**
 * Format a date-only string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...) as MM/DD/YYYY using local calendar date.
 * Avoids UTC-midnight parsing so DOB and other date-only values display and sort correctly in all timezones.
 */
const formatDateOnly = (dateStr?: string): string => {
  if (!dateStr) return ''
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    const [, y, m, d] = match
    const year = parseInt(y!, 10)
    const month = parseInt(m!, 10) - 1
    const day = parseInt(d!, 10)
    const date = new Date(year, month, day)
    if (isNaN(date.getTime())) return ''
    const monthStr = String(date.getMonth() + 1).padStart(2, '0')
    const dayStr = String(date.getDate()).padStart(2, '0')
    const yearStr = String(date.getFullYear())
    return `${monthStr}/${dayStr}/${yearStr}`
  }
  return formatDate(dateStr)
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

/**
 * Normalize event products from API (array, comma-separated string, or alternate key).
 * DB may store as string or array; ensures Products column has data in report rows.
 */
function normalizeEventProducts(event: EventDocument & Record<string, unknown>): string[] {
  const raw = event.products ?? event['products']
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.filter((p): p is string => typeof p === 'string').map((p) => p.trim()).filter(Boolean)
  if (typeof raw === 'string') return (raw as string).split(',').map((p) => p.trim()).filter((p) => p.length > 0)
  return [String(raw)]
}

// Wrap long text at word boundaries so PDF table cells don't crop (max chars per line)
const wrapTextForPdf = (text: string, maxCharsPerLine = 35): string => {
  if (!text || text.length <= maxCharsPerLine) return text
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxCharsPerLine) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine) : word
    }
  }
  if (current) lines.push(current)
  return lines.join('\n')
}

// Column keys that hold display dates (MM/DD/YYYY) for sort order in exports
const SORT_DATE_COLUMN_KEYS = new Set(['dob', 'signUpDate', 'lastLoginDate', 'date', 'signupDate'])
// Numeric columns that sort descending in export so order matches Preview Reports UI
const SORT_DESCENDING_NUMERIC_KEYS = new Set(['userPoints', 'checkInReviewPoints', 'checkIns', 'reviews', 'triviasWon', 'favorites'])

const parseSortableDate = (value: string | number): number => {
  if (value === '' || value === undefined || value === null) return NaN
  const str = String(value).trim()
  if (!str) return NaN
  const mmddyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mmddyy) {
    const [, month, day, year] = mmddyy
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    return isNaN(d.getTime()) ? NaN : d.getTime()
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? NaN : d.getTime()
}

/**
 * Sort rows for export so PDF/CSV match the Preview Reports sort (same key, direction, and tie-break).
 */
function sortReportRows(
  rows: Record<string, string | number>[],
  sortKey: string
): Record<string, string | number>[] {
  if (rows.length === 0) return rows
  const isDateColumn = SORT_DATE_COLUMN_KEYS.has(sortKey)
  const descendingNumeric = SORT_DESCENDING_NUMERIC_KEYS.has(sortKey)
  const withIndex = rows.map((row, i) => ({ row, i }))
  withIndex.sort(({ row: a, i: aIdx }, { row: b, i: bIdx }) => {
    const aValue = a[sortKey] ?? ''
    const bValue = b[sortKey] ?? ''
    let cmp = 0
    if (isDateColumn) {
      const aTime = parseSortableDate(aValue as string)
      const bTime = parseSortableDate(bValue as string)
      const aEmpty = isNaN(aTime)
      const bEmpty = isNaN(bTime)
      if (aEmpty && bEmpty) cmp = 0
      else if (aEmpty) cmp = 1
      else if (bEmpty) cmp = -1
      else cmp = aTime - bTime
    } else {
      const aNum = Number(aValue)
      const bNum = Number(bValue)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        cmp = descendingNumeric ? bNum - aNum : aNum - bNum
      } else {
        cmp = String(aValue).localeCompare(String(bValue))
      }
    }
    if (cmp !== 0) return cmp
    const aUser = String(a.username ?? a.firstName ?? a[sortKey] ?? '')
    const bUser = String(b.username ?? b.firstName ?? b[sortKey] ?? '')
    const nameCmp = aUser.localeCompare(bUser)
    return nameCmp !== 0 ? nameCmp : aIdx - bIdx
  })
  return withIndex.map(({ row }) => row)
}

// Appwrite listDocuments returns max 25 by default. Fetch all users in pages for report consistency.
const REPORT_USERS_PAGE_SIZE = 100
const REPORT_LIST_PAGE_SIZE = 100
const REPORT_REVIEWS_PAGE_SIZE = 500
const EVENT_IDS_BATCH_SIZE = 25

/**
 * Check-in/Review Pts = sum of (event check-in points + review points) per user.
 * For each review: add event.checkInPoints + review.pointsEarned to that user's total.
 * When dateRange is provided, only reviews with $createdAt within the range are included.
 */
async function fetchCheckInReviewPointsByUser(
  dateRange?: { start: Date | null; end: Date | null }
): Promise<Map<string, number>> {
  const userTotals = new Map<string, number>()
  const reviewRows: { user?: string; event?: string; pointsEarned?: number }[] = []
  let offset = 0
  let docs: { user?: string; event?: string; pointsEarned?: number }[] = []

  do {
    const queries: string[] = [
      Query.limit(REPORT_REVIEWS_PAGE_SIZE),
      Query.offset(offset),
    ]
    if (dateRange?.start) {
      queries.push(Query.greaterThanEqual('$createdAt', dateRange.start.toISOString()))
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      queries.push(Query.lessThanEqual('$createdAt', endDate.toISOString()))
    }
    const result = await reviewsService.list(queries) as { documents: { user?: string; event?: string; pointsEarned?: number }[] }
    docs = result.documents ?? []
    reviewRows.push(...docs)
    offset += REPORT_REVIEWS_PAGE_SIZE
  } while (docs.length === REPORT_REVIEWS_PAGE_SIZE)

  const toId = (v: string | { $id?: string } | undefined): string | undefined =>
    v == null ? undefined : typeof v === 'string' ? v : (v as { $id?: string }).$id
  const eventIds = [...new Set(reviewRows.map((r) => toId(r.event)).filter(Boolean))] as string[]
  const eventPointsMap = new Map<string, number>()

  for (let i = 0; i < eventIds.length; i += EVENT_IDS_BATCH_SIZE) {
    const chunk = eventIds.slice(i, i + EVENT_IDS_BATCH_SIZE)
    const eventsResult = await eventsService.list([Query.equal('$id', chunk)]) as { documents: EventDocument[] }
    const events = eventsResult.documents ?? []
    for (const event of events) {
      const pts = (event.checkInPoints as number) ?? 0
      eventPointsMap.set(event.$id, pts)
    }
  }

  for (const r of reviewRows) {
    const userId = toId(r.user)
    if (!userId) continue
    const eventId = toId(r.event)
    const eventPts = (eventId ? eventPointsMap.get(eventId) : undefined) ?? 0
    const reviewPts = (typeof r.pointsEarned === 'number' ? r.pointsEarned : 0) ?? 0
    const add = eventPts + reviewPts
    userTotals.set(userId, (userTotals.get(userId) ?? 0) + add)
  }

  return userTotals
}

async function fetchAllAppUsers(
  dateRange?: { start: Date | null; end: Date | null }
): Promise<AppUser[]> {
  const all: AppUser[] = []
  let offset = 0
  let chunk: AppUser[]
  do {
    const queries: string[] = [
      Query.orderDesc('$createdAt'),
      Query.limit(REPORT_USERS_PAGE_SIZE),
      Query.offset(offset),
    ]
    if (dateRange?.start) {
      queries.push(Query.greaterThanEqual('$createdAt', dateRange.start.toISOString()))
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      queries.push(Query.lessThanEqual('$createdAt', endDate.toISOString()))
    }
    chunk = await appUsersService.list(queries)
    all.push(...chunk)
    offset += REPORT_USERS_PAGE_SIZE
  } while (chunk.length === REPORT_USERS_PAGE_SIZE)
  return all
}

/** Build a map of user ID -> count of trivia wins (correct answers). Fetches all trivia and responses in batches. */
async function fetchTriviasWonCountByUser(): Promise<Map<string, number>> {
  const correctIndexByTriviaId = new Map<string, number>()
  let offset = 0
  let chunk: TriviaDocument[]
  do {
    const listResult = await triviaService.list([
      Query.limit(REPORT_LIST_PAGE_SIZE),
      Query.offset(offset),
    ]) as { documents: TriviaDocument[] }
    chunk = listResult.documents
    for (const t of chunk) {
      if (t.$id != null && t.correctOptionIndex != null) {
        correctIndexByTriviaId.set(t.$id, t.correctOptionIndex)
      }
    }
    offset += REPORT_LIST_PAGE_SIZE
  } while (chunk.length === REPORT_LIST_PAGE_SIZE)

  const countByUserId = new Map<string, number>()
  offset = 0
  let responseChunk: TriviaResponseDocument[]
  do {
    const listResult = await triviaResponsesService.list([
      Query.limit(REPORT_LIST_PAGE_SIZE),
      Query.offset(offset),
    ]) as { documents: TriviaResponseDocument[] }
    responseChunk = listResult.documents ?? []
    for (const r of responseChunk) {
      const tid = typeof r.trivia === 'string' ? r.trivia : (r.trivia as unknown as { $id?: string })?.$id
      const uid = typeof r.user === 'string' ? r.user : (r.user as unknown as { $id?: string })?.$id
      if (!uid || !tid) continue
      const correctIndex = correctIndexByTriviaId.get(tid)
      if (correctIndex === undefined) continue
      if (r.answerIndex === correctIndex) {
        countByUserId.set(uid, (countByUserId.get(uid) ?? 0) + 1)
      }
    }
    offset += REPORT_LIST_PAGE_SIZE
  } while (responseChunk.length === REPORT_LIST_PAGE_SIZE)

  return countByUserId
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
        return await this.generateEventListReport(dateRange)
      
      case 'clients-brands':
        return await this.generateClientsBrandsReport(dateRange)
      
      case 'app-users':
        return await this.generateAppUsersReport(dateRange)
      
      case 'points-earned-all':
        return await this.generatePointsEarnedReport(dateRange, false)
      case 'points-earned-date-range':
        return await this.generatePointsEarnedReport(dateRange, true)

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
    const baseQueries: string[] = [
      Query.equal('isArchived', false), // Only active events
      Query.orderDesc('date'),
    ]

    // Apply date range filter if provided
    if (dateRange?.start) {
      baseQueries.push(Query.greaterThanEqual('date', dateRange.start.toISOString()))
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      baseQueries.push(Query.lessThanEqual('date', endDate.toISOString()))
    }

    // Paginate to fetch all events in range (Appwrite default limit is 25)
    const allDocuments: EventDocument[] = []
    let offset = 0
    let chunk: EventDocument[]
    do {
      const queries = [...baseQueries, Query.limit(REPORT_LIST_PAGE_SIZE), Query.offset(offset)]
      const eventsResult = await eventsService.list(queries)
      chunk = (eventsResult.documents ?? []) as EventDocument[]
      allDocuments.push(...chunk)
      offset += REPORT_LIST_PAGE_SIZE
    } while (chunk.length === REPORT_LIST_PAGE_SIZE)

    // Map events to report rows (Products column populated via normalizeEventProducts)
    const rows = await Promise.all(
      allDocuments.map(async (event: EventDocument & Record<string, unknown>) => {
        let brandName = ''
        if (event.client) {
          try {
            const client = await clientsService.getById(event.client)
            brandName = client.name || ''
          } catch (err) {
            console.error('Error fetching client for event:', err)
          }
        }

        const productsArray = normalizeEventProducts(event)
        const hasDiscount = (event.discount != null && String(event.discount).trim() !== '') ||
          (event.discountImageURL != null && String(event.discountImageURL).trim() !== '')
        return {
          date: formatDate(event.date),
          venueName: event.name || '',
          brand: brandName,
          startTime: formatTime(event.startTime),
          endTime: formatTime(event.endTime),
          products: formatProducts(productsArray),
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
   * Generate Event List report.
   * When dateRange is provided, filters events by event date (single day or range; future dates allowed).
   */
  async generateEventListReport(
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const queries: string[] = [
      Query.equal('isArchived', false),
      Query.orderDesc('date'),
    ]
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

        // Resolve category ID to category title
        let categoryTitle = ''
        if (event.categories) {
          try {
            const category = await categoriesService.getById(event.categories)
            categoryTitle = category?.title || ''
          } catch (err) {
            console.error('Error fetching category for event:', err)
          }
        }

        // Normalize products: DB may store array or comma-separated string (same as Dashboard)
        const productsArray = Array.isArray(event.products)
          ? event.products
          : event.products
            ? typeof event.products === 'string'
              ? (event.products as string).split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
              : [event.products as unknown as string]
            : []

        // Extract latitude and longitude from location array [longitude, latitude]
        let latitude = ''
        let longitude = ''
        if (event.location && Array.isArray(event.location) && event.location.length === 2) {
          longitude = event.location[0]?.toString() || ''
          latitude = event.location[1]?.toString() || ''
        }

        return {
          name: event.name || '',
          date: formatDateForUpload(event.date),
          startTime: formatTimeForUpload(event.startTime),
          endTime: formatTimeForUpload(event.endTime),
          category: categoryTitle,
          brandName: brandName,
          brandDescription: event.brandDescription || '',
          products: formatProducts(productsArray),
          discount: event.discount?.toString() || '',
          discountImageURL: event.discountImageURL || '',
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
   * Generate Clients & Brands report.
   * When dateRange is provided, filters clients by signup date ($createdAt).
   * # of Favorites = count of users who have any of the client's events in their favorites.
   */
  async generateClientsBrandsReport(
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const queries: string[] = [Query.orderDesc('$createdAt')]
    if (dateRange?.start) {
      queries.push(Query.greaterThanEqual('$createdAt', dateRange.start.toISOString()))
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      queries.push(Query.lessThanEqual('$createdAt', endDate.toISOString()))
    }

    const clientsResult = await clientsService.list(queries)
    const documents = (clientsResult?.documents ?? []) as ClientDocument[]
    const clientIds = documents.map((c) => (c as { $id?: string }).$id).filter((id): id is string => !!id)

    const statsMap = clientIds.length > 0
      ? await clientsService.getClientsStats(clientIds)
      : new Map<string, { totalEvents: number; totalFavorites: number; totalCheckIns: number; totalPoints: number }>()

    const rows = documents.map((client: ClientDocument) => {
      const clientId = (client as { $id?: string }).$id
      const stats = clientId ? statsMap.get(clientId) : undefined
      const totalFavorites = stats?.totalFavorites ?? 0
      return {
        name: client.name || '',
        logoFile: client.logoURL ? 'Yes' : 'No',
        signupDate: formatDate(client.$createdAt),
        productType: formatProducts(client.productType),
        favorites: String(totalFavorites),
      }
    })

    return {
      columns: clientsBrandsColumns,
      rows,
    }
  },

  /**
   * Generate App Users report.
   * When dateRange is provided, filters users by sign-up date ($createdAt); single day or range; future dates allowed.
   */
  async generateAppUsersReport(
    dateRange?: { start: Date | null; end: Date | null }
  ): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const [usersResult, checkInReviewPointsByUser, triviasWonByUser] = await Promise.all([
      fetchAllAppUsers(dateRange),
      fetchCheckInReviewPointsByUser(), // all-time check-in pts + review pts per user
      fetchTriviasWonCountByUser(),
    ])

    const rows = usersResult.map((user: AppUser) => {
      const userRecord = user as Record<string, unknown>
      const userId = (user as { $id?: string }).$id

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
      // Check-in/Review Pts = sum of (event check-in points + review points) per user
      const checkInReviewPoints =
        (userId ? checkInReviewPointsByUser.get(userId) : undefined) ??
        (userRecord.checkInReviewPoints as number) ??
        0
      // Trivias Won = actual count from trivia_responses (correct answers), fallback to stored value
      const triviasWon = (userId ? triviasWonByUser.get(userId) : undefined) ?? (userRecord.triviasWon as number) ?? 0

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
        dob: formatDateOnly(userRecord.dob as string | undefined),
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
   * Check-in/Review Pts = events points + reviews points (check-in points from events + pointsEarned from reviews).
   * When useDateRangeForPoints is true, only points from reviews created within dateRange are included.
   */
  async generatePointsEarnedReport(
    dateRange?: { start: Date | null; end: Date | null },
    useDateRangeForPoints = false
  ): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const pointsDateRange = useDateRangeForPoints ? dateRange : undefined
    const [usersResult, checkInReviewPointsByUser] = await Promise.all([
      fetchAllAppUsers(),
      fetchCheckInReviewPointsByUser(pointsDateRange),
    ])

    const rows = usersResult.map((user: AppUser) => {
      const userRecord = user as Record<string, unknown>
      const userId = (user as { $id?: string }).$id

      // Map user_profiles fields - totalPoints is the main field for user points
      const totalPoints = (userRecord.totalPoints as number) ?? (userRecord.userPoints as number) ?? 0
      // Check-in/Review Pts = sum of (event checkInPoints + review pointsEarned) for each of the user's reviews
      const checkInReviewPoints =
        (userId ? checkInReviewPointsByUser.get(userId) : undefined) ??
        (userRecord.checkInReviewPoints as number) ??
        0

      // Tier Level from user_profiles; fallback from totalPoints if not set
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
        lastLoginDate: formatDate(user.lastLoginDate),
        tierLevel,
        userPoints: totalPoints.toString(),
        checkInReviewPoints: checkInReviewPoints.toString(),
      }
    })

    // Sort by userPoints descending; stable tie-break by username then index
    const withIndex = rows.map((row, i) => ({ row, i }))
    withIndex.sort(({ row: a, i: aIdx }, { row: b, i: bIdx }) => {
      const aPoints = parseInt(a.userPoints as string) || 0
      const bPoints = parseInt(b.userPoints as string) || 0
      if (bPoints !== aPoints) return bPoints - aPoints
      const nameCmp = String(a.username ?? '').localeCompare(String(b.username ?? ''))
      return nameCmp !== 0 ? nameCmp : aIdx - bIdx
    })
    rows.length = 0
    rows.push(...withIndex.map(({ row }) => row))

    return {
      columns: pointsEarnedColumns,
      rows,
    }
  },

  /**
   * Generate Event Reviews report for a single event (for Download on event-reviews/:eventId page).
   */
  async generateEventReviewsReport(eventId: string): Promise<{ columns: ReportColumn[]; rows: Record<string, string | number>[] }> {
    const eventReviewColumns: ReportColumn[] = [
      { header: 'Reviewer Name', key: 'reviewerName' },
      { header: 'Email', key: 'email' },
      { header: 'Rating', key: 'rating' },
      { header: 'Review', key: 'review' },
      { header: 'Reviewed At', key: 'reviewedAt' },
      { header: 'Answers', key: 'answers' },
    ]
    const rows: Record<string, string | number>[] = []
    let offset = 0
    const limit = 100
    let documents: ReviewDocument[] = []

    do {
      const result = await reviewsService.list([
        Query.equal('event', eventId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset),
      ])
      documents = result.documents ?? []
      for (const doc of documents) {
        let reviewerName = 'Anonymous'
        let email = ''
        if (doc.user) {
          try {
            const user = await appUsersService.getById(doc.user as string)
            reviewerName = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || (user?.username as string) || 'Anonymous'
            email = (user as { email?: string }).email ?? ''
          } catch {
            // keep defaults
          }
        }
        const liked = doc.liked as string | undefined
        const answersDisplay = liked
          ? String(liked)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
              .join(', ')
          : ''
        const createdAt = doc.$createdAt
        const reviewedAt = createdAt
          ? `${formatDate(createdAt)} ${formatTime(createdAt)}`
          : ''
        rows.push({
          reviewerName,
          email,
          rating: doc.rating ?? 0,
          review: doc.review ?? '',
          reviewedAt,
          answers: answersDisplay,
        })
      }
      offset += limit
    } while (documents.length === limit)

    return {
      columns: eventReviewColumns,
      rows,
    }
  },

  /**
   * Export Event Reviews report (CSV or PDF) for a single event.
   */
  async exportEventReviewsReport(
    eventId: string,
    eventName: string,
    filename: string,
    format: 'csv' | 'pdf'
  ): Promise<void> {
    const { columns, rows } = await this.generateEventReviewsReport(eventId)
    if (format === 'csv') {
      const csvContent = this.exportToCSV(columns, rows)
      this.downloadCSV(filename, csvContent)
    } else {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`Event Reviews: ${eventName || 'Event'}`, 14, 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
      const headers = columns.map((c) => c.header)
      const tableRows = rows.map((row) =>
        columns.map((col) => wrapTextForPdf(String(row[col.key] ?? '')))
      )
      const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width
      const tableWidth = Math.min(pageWidth - 20, pageWidth * 0.98)
      const colWidth = tableWidth / columns.length
      const columnStyles: Record<string, { cellWidth: number; overflow: 'linebreak' }> = {}
      columns.forEach((_, i) => {
        columnStyles[String(i)] = { cellWidth: colWidth, overflow: 'linebreak' }
      })
      autoTable(doc, {
        head: [headers],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        tableWidth,
        margin: { left: 10, right: 10 },
        columnStyles,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { valign: 'top' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      })
      doc.save(filename)
    }
  },

  /**
   * Export data to CSV format.
   * @param sortLabel - If provided, prepends a comment line "Sorted by: {sortLabel}" so the file documents sort order.
   */
  exportToCSV(columns: ReportColumn[], rows: Record<string, string | number>[], sortLabel?: string): string {
    const header = columns.map(col => col.header).join(',')
    const csvRows = rows.map(row => {
      return columns.map(col => {
        const value = col.getValue ? col.getValue(row) : row[col.key]
        const stringValue = String(value ?? '')
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    })
    const body = [header, ...csvRows].join('\n')
    if (sortLabel) {
      return `# Sorted by: ${sortLabel}\n${body}`
    }
    return body
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
   * Export report to CSV and download.
   * Exported data is sorted by effectiveSortKey (provided sortKey or first column) so order matches Preview.
   */
  async exportReport(
    reportType: ReportType,
    filename: string,
    dateRange?: { start: Date | null; end: Date | null },
    sortKey?: string
  ): Promise<void> {
    try {
      const { columns, rows } = await this.generateReportData(reportType, dateRange)
      const columnKeys = new Set(columns.map((c) => c.key))
      const effectiveSortKey = sortKey && columnKeys.has(sortKey) ? sortKey : columns[0]?.key
      const sortedRows = effectiveSortKey ? sortReportRows(rows, effectiveSortKey) : rows
      const sortLabel = effectiveSortKey ? (columns.find(c => c.key === effectiveSortKey)?.header ?? effectiveSortKey) : undefined
      const csvContent = this.exportToCSV(columns, sortedRows, sortLabel)
      this.downloadCSV(filename, csvContent)
    } catch (error) {
      console.error('Error exporting report:', error)
      throw error
    }
  },

  /**
   * Export report to PDF.
   * Exported data is sorted by effectiveSortKey (provided sortKey or first column) so order matches Preview.
   */
  async exportReportToPDF(
    reportType: ReportType,
    filename: string,
    dateRange?: { start: Date | null; end: Date | null },
    sortKey?: string
  ): Promise<void> {
    try {
      const { columns, rows } = await this.generateReportData(reportType, dateRange)
      const columnKeys = new Set(columns.map((c) => c.key))
      const effectiveSortKey = sortKey && columnKeys.has(sortKey) ? sortKey : columns[0]?.key
      const sortedRows = effectiveSortKey ? sortReportRows(rows, effectiveSortKey) : rows

      // Use landscape when 5+ columns so all columns fit on page without being cut off
      const colCount = columns.length
      const useLandscape = colCount >= 5
      const doc = new jsPDF({
        orientation: useLandscape ? 'landscape' : 'portrait',
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
      let startY = 28
      if (dateRange && (dateRange.start || dateRange.end)) {
        const rangeText = `Date Range: ${dateRange.start ? formatDate(dateRange.start.toISOString()) : 'N/A'} - ${dateRange.end ? formatDate(dateRange.end.toISOString()) : 'N/A'}`
        doc.text(rangeText, 14, 28)
        startY = 32
      }
      if (effectiveSortKey) {
        const sortHeader = columns.find(c => c.key === effectiveSortKey)?.header ?? effectiveSortKey
        doc.text(`Sorted by: ${sortHeader}`, 14, startY)
        startY += 6
      }

      // Prepare table data (use sorted rows); wrap long cell text so PDF does not crop
      const headers = columns.map(col => col.header)
      const tableRows = sortedRows.map(row =>
        columns.map(col => {
          const value = col.getValue ? col.getValue(row) : row[col.key]
          return wrapTextForPdf(String(value ?? ''))
        })
      )
      
      // Table width and column widths: explicit widths so all columns fit on page and text wraps
      const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width
      const marginLeft = 10
      const marginRight = 10
      const tableWidth = Math.min(pageWidth - marginLeft - marginRight, pageWidth * 0.98)
      const numCols = headers.length
      const colWidth = tableWidth / numCols
      const columnStyles: Record<string, { cellWidth: number; overflow: 'linebreak' }> = {}
      for (let i = 0; i < numCols; i++) {
        columnStyles[String(i)] = { cellWidth: colWidth, overflow: 'linebreak' }
      }
      // Smaller font when many columns so all columns remain visible
      const tableFontSize = numCols > 8 ? 6 : 7

      autoTable(doc, {
        head: [headers],
        body: tableRows,
        startY,
        theme: 'grid',
        tableWidth,
        margin: { left: marginLeft, right: marginRight },
        columnStyles,
        styles: {
          fontSize: tableFontSize,
          cellPadding: 2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue-500
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          valign: 'top',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // Gray-50
        },
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
      case 'points-earned-date-range':
        return 'Points Earned Report (Date Range)'
      default:
        return 'Report'
    }
  },
}
