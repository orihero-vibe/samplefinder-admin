import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Models } from 'appwrite'
import { DashboardLayout, ShimmerPage, ConfirmationModal } from '../../components'
import type { ConfirmationType } from '../../components'
import { eventsService, categoriesService, clientsService, statisticsService, type DashboardStats, type ClientDocument } from '../../lib/services'
import { storage, appwriteConfig, ID } from '../../lib/appwrite'
import { useNotificationStore } from '../../stores/notificationStore'
import { formatDateWithTimezone } from '../../lib/dateUtils'
import type { EventDocument } from '../../lib/services'
import { Query } from '../../lib/appwrite'
import {
  MetricsCards,
  SearchAndFilter,
  EventsTable,
  DashboardHeader,
  AddEventModal,
  EditEventModal,
  DateFilterModal,
  CSVUploadModal,
} from './components'

// Event interface for EventsTable (UI format)
interface Event {
  date: string
  venueName: string
  brand: string
  startTime: string
  endTime: string
  discount: string
  status: string
  statusColor: string
  id?: string // Add optional id for database reference
}

// Use EventDocument from services instead of creating a duplicate
type LocalEventDocument = EventDocument

const Dashboard = () => {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedEventDoc, setSelectedEventDoc] = useState<EventDocument | null>(null)
  const [editModalInitialData, setEditModalInitialData] = useState<{
    eventName?: string
    eventDate?: string
    startTime?: string
    endTime?: string
    city?: string
    address?: string
    state?: string
    zipCode?: string
    category?: string
    products?: string[]
    discount?: string
    discountImage?: File | string | null
    checkInCode?: string
    brandName?: string
    checkInPoints?: string
    reviewPoints?: string
    eventInfo?: string
    latitude?: string
    longitude?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalEvents, setTotalEvents] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [categories, setCategories] = useState<Array<Models.Document & { title: string }>>([])
  const [brands, setBrands] = useState<Array<Models.Document & { name: string }>>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all') // 'all', 'active', 'hidden', 'archived'
  const [sortBy, setSortBy] = useState<string>('date-desc') // 'date-asc', 'date-desc', 'name-asc', 'name-desc', 'brand-asc', 'brand-desc'
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    type: ConfirmationType
    onConfirm: () => void
    itemName?: string
  }>({
    isOpen: false,
    type: 'delete',
    onConfirm: () => {},
  })
  
  const { addNotification } = useNotificationStore()
  const [statistics, setStatistics] = useState<DashboardStats | null>(null)

  // Helper functions for formatting
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
  }

  const formatPercentage = (change?: number): string => {
    if (change === undefined || change === null) return '+0%'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change}%`
  }

  // Helper function to map database event document to EventsTable format
  const mapEventDocumentToEvent = (doc: LocalEventDocument): Event => {
    // Format date from ISO string or timestamp to MM/DD/YYYY
    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = date.getFullYear()
      return `${month}/${day}/${year}`
    }

    // Format time from ISO datetime string to 12-hour format
    const formatTime = (timeStr?: string): string => {
      if (!timeStr) return ''
      
      // Parse as Date object to handle ISO datetime strings correctly
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) {
        // If not a valid date, try to parse as HH:MM format
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':')
          if (parts.length >= 2) {
            const hour = parseInt(parts[0], 10)
            const minute = parseInt(parts[1], 10)
            if (!isNaN(hour) && !isNaN(minute)) {
              const ampm = hour >= 12 ? 'PM' : 'AM'
              const hour12 = hour % 12 || 12
              return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
            }
          }
        }
        return timeStr
      }
      
      // Format date object to 12-hour time
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
    }

    // Derive status from isArchived and isHidden fields
    const getStatus = (doc: LocalEventDocument): string => {
      if (doc.isArchived) {
        return 'Archived'
      } else if (doc.isHidden) {
        return 'Hidden'
      }
      return 'Active'
    }

    // Determine status color based on status value
    const getStatusColor = (status: string): string => {
      const statusLower = status.toLowerCase()
      if (statusLower === 'active') {
        return 'bg-green-100 text-green-800'
      } else if (statusLower === 'hidden') {
        return 'bg-red-100 text-red-800'
      } else if (statusLower === 'archived') {
        return 'bg-gray-100 text-gray-800'
      }
      return 'bg-gray-100 text-gray-800'
    }

    // Convert discount boolean/string/number to "YES"/"NO"
    const formatDiscount = (discount?: boolean | string | number): string => {
      if (discount === undefined || discount === null) return 'NO'
      if (typeof discount === 'boolean') {
        return discount ? 'YES' : 'NO'
      }
      if (typeof discount === 'string') {
        const lower = discount.toLowerCase()
        return lower === 'yes' || lower === 'true' ? 'YES' : 'NO'
      }
      if (typeof discount === 'number') {
        return discount > 0 ? 'YES' : 'NO'
      }
      return 'NO'
    }

    const status = getStatus(doc)
    
    return {
      id: doc.$id,
      date: formatDate(doc.date),
      venueName: doc.name || '',
      brand: '', // Will be populated from client relationship if needed
      startTime: formatTime(doc.startTime),
      endTime: formatTime(doc.endTime),
      discount: formatDiscount(doc.discount),
      status: status,
      statusColor: getStatusColor(status),
    }
  }

  // Fetch events from database with pagination, search, filter, and sort
  const fetchEvents = async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      
      // Build base queries
      const queries: string[] = []
      
      // Apply status filter
      if (statusFilter === 'active') {
        queries.push(Query.equal('isArchived', false))
        queries.push(Query.equal('isHidden', false))
      } else if (statusFilter === 'hidden') {
        queries.push(Query.equal('isHidden', true))
        queries.push(Query.equal('isArchived', false))
      } else if (statusFilter === 'archived') {
        queries.push(Query.equal('isArchived', true))
      }
      // 'all' status doesn't need any filter
      
      // Apply date range filter
      if (dateRange.start) {
        queries.push(Query.greaterThanEqual('date', dateRange.start.toISOString()))
      }
      if (dateRange.end) {
        // Set end date to end of day
        const endDate = new Date(dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        queries.push(Query.lessThanEqual('date', endDate.toISOString()))
      }
      
      // Apply sorting - parse sortBy value (format: "field-order")
      const [sortField, sortOrder] = sortBy.split('-')
      const orderMethod = sortOrder === 'asc' ? Query.orderAsc : Query.orderDesc
      if (sortField === 'date') {
        queries.push(orderMethod('date'))
      } else if (sortField === 'name') {
        queries.push(orderMethod('name'))
      } else if (sortField === 'brand') {
        // For brand sorting, we'll sort by date first, then handle brand sorting client-side
        // since brand is a relationship field
        queries.push(orderMethod('date'))
      }
      
      // Determine if we're searching
      const isSearching = searchTerm.trim().length > 0
      
      // When searching, fetch more records for client-side filtering, then paginate results
      // When not searching, use server-side pagination
      if (!isSearching) {
        queries.push(Query.limit(pageSize))
        queries.push(Query.offset((page - 1) * pageSize))
      } else {
        // Fetch up to 500 records for search filtering
        queries.push(Query.limit(500))
      }
      
      // Fetch events with filters
      // Use search service if search term exists (does client-side filtering), otherwise use list service
      const result = isSearching
        ? await eventsService.search(searchTerm.trim(), queries)
        : await eventsService.list(queries)
      
      // Extract pagination metadata
      const total = result.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalEvents(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        // Recursively fetch with corrected page (only if we're not already on that page to avoid infinite loop)
        if (page !== lastValidPage) {
          return fetchEvents(lastValidPage)
        }
      } else if (totalPagesCount === 0) {
        // If no results, ensure we're on page 1
        setCurrentPage(1)
      }
      
      // For search results, apply client-side pagination
      const documentsToProcess = isSearching
        ? result.documents.slice((page - 1) * pageSize, page * pageSize)
        : result.documents
      
      // OPTIMIZATION: Collect all unique client IDs and fetch them in a single batch
      const clientIds = [...new Set(
        documentsToProcess
          .map(doc => doc.client as string | undefined)
          .filter((id): id is string => !!id)
      )]
      
      // Batch fetch all clients at once using the optimized service method
      const clientsMap = clientIds.length > 0 
        ? await clientsService.getByIds(clientIds)
        : new Map<string, ClientDocument>()
      
      // Map events using the pre-fetched client data
      let mappedEvents = documentsToProcess.map((doc) => {
        const event = mapEventDocumentToEvent(doc as unknown as LocalEventDocument)
        
        // Look up client name from the map (instant lookup)
        if (doc.client) {
          const client = clientsMap.get(doc.client as string)
          event.brand = client?.name || ''
        }
        
        return event
      })
      
      // Apply client-side brand sorting if needed (since brand is a relationship)
      if (sortField === 'brand') {
        mappedEvents = mappedEvents.sort((a, b) => {
          const comparison = a.brand.localeCompare(b.brand)
          return sortOrder === 'asc' ? comparison : -comparison
        })
      }
      
      setEvents(mappedEvents)
      setCurrentPage(page)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events'
      addNotification({
        type: 'error',
        title: 'Error Loading Events',
        message: errorMessage,
      })
      console.error('Error fetching events:', err)
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchEvents(page)
      // Scroll to top of table for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Fetch full event document for editing
  const fetchEventForEdit = async (eventId: string): Promise<EventDocument | null> => {
    try {
      const eventDoc = await eventsService.getById(eventId)
      return eventDoc
    } catch (err) {
      console.error('Error fetching event for edit:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Event',
        message: 'Failed to load event details for editing.',
      })
      return null
    }
  }

  // Format event document for edit modal initialData
  const formatEventForEditModal = async (eventDoc: EventDocument) => {
    // Fetch category title if category relationship exists
    let categoryTitle = ''
    if (eventDoc.categories) {
      try {
        const category = await categoriesService.getById(eventDoc.categories as string)
        categoryTitle = category.title
      } catch (err) {
        console.error('Error fetching category:', err)
      }
    }

    // Fetch client name if client relationship exists
    let brandName = ''
    if (eventDoc.client) {
      try {
        const client = await clientsService.getById(eventDoc.client as string)
        brandName = client.name
      } catch (err) {
        console.error('Error fetching client:', err)
      }
    }

    // Format date for date input (YYYY-MM-DD)
    const formatDateForDateInput = (dateStr: string): string => {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Format time for time input (HH:MM)
    const formatTimeForTimeInput = (dateStr: string): string => {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }

    // Format discount number for the input field
    const formatDiscount = (discount?: number): string => {
      if (discount === undefined || discount === null) return ''
      return discount.toString()
    }

    // Handle products - ensure it's always an array
    const productsArray = Array.isArray(eventDoc.products) 
      ? eventDoc.products 
      : eventDoc.products 
        ? [eventDoc.products as unknown as string]
        : []

    // Extract latitude and longitude from location array if it exists
    let latitude = ''
    let longitude = ''
    if (eventDoc.location && Array.isArray(eventDoc.location) && eventDoc.location.length === 2) {
      longitude = eventDoc.location[0]?.toString() || ''
      latitude = eventDoc.location[1]?.toString() || ''
    }

    return {
      eventName: eventDoc.name || '',
      eventDate: formatDateForDateInput(eventDoc.date),
      startTime: formatTimeForTimeInput(eventDoc.startTime),
      endTime: formatTimeForTimeInput(eventDoc.endTime),
      city: eventDoc.city || '',
      address: eventDoc.address || '',
      state: eventDoc.state || '',
      zipCode: eventDoc.zipCode || '',
      category: categoryTitle,
      products: productsArray,
      discount: formatDiscount(eventDoc.discount),
      discountImage: eventDoc.discountImageURL || null,
      checkInCode: eventDoc.checkInCode || '',
      brandName: brandName,
      checkInPoints: eventDoc.checkInPoints?.toString() || '',
      reviewPoints: eventDoc.reviewPoints?.toString() || '',
      eventInfo: eventDoc.eventInfo || '',
      latitude: latitude,
      longitude: longitude,
    }
  }

  // Upload file to Appwrite Storage
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      if (!appwriteConfig.storage.bucketId) {
        throw new Error('Storage bucket ID is not configured')
      }

      const fileId = ID.unique()
      const result = await storage.createFile(
        appwriteConfig.storage.bucketId,
        fileId,
        file
      )

      // Get file preview URL
      const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storage.bucketId}/files/${result.$id}/view?project=${appwriteConfig.projectId}`
      return fileUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  // Helper function to extract error message from Appwrite error
  const extractErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>
      
      // Check for Appwrite error response format
      if ('response' in errorObj && errorObj.response && typeof errorObj.response === 'object') {
        const response = errorObj.response as Record<string, unknown>
        if ('message' in response && typeof response.message === 'string') {
          return response.message
        }
      }
      
      // Check for direct message property
      if ('message' in errorObj && typeof errorObj.message === 'string') {
        return errorObj.message
      }
    }
    
    // Fallback for Error instances
    if (error instanceof Error) {
      return error.message
    }
    
    return 'An unexpected error occurred'
  }

  // Parse CSV file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row')
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    
    // Normalize header names (case-insensitive, handle variations)
    const normalizeHeader = (header: string): string => {
      const lower = header.toLowerCase().trim()
      const headerMap: Record<string, string> = {
        // Required columns
        'event name': 'Event Name',
        'eventname': 'Event Name',
        'name': 'Event Name',
        'date': 'Date',
        'address': 'Address',
        'city': 'City',
        'state': 'State',
        'zip code': 'Zip Code',
        'zipcode': 'Zip Code',
        'zip': 'Zip Code',
        'brand name': 'Brand Name',
        'brandname': 'Brand Name',
        'brand': 'Brand Name',
        'points': 'Points',
        'point': 'Points',
        // Optional columns
        'start time': 'Start Time',
        'starttime': 'Start Time',
        'end time': 'End Time',
        'endtime': 'End Time',
        'category': 'Category',
        'product type': 'Products',
        'producttype': 'Products',
        'products': 'Products',
        'discount': 'Discount',
        'discount image url': 'Discount Image URL',
        'discountimageurl': 'Discount Image URL',
        'discount image': 'Discount Image URL',
        'event info': 'Event Info',
        'eventinfo': 'Event Info',
        'check-in code': 'Check-in Code',
        'checkincode': 'Check-in Code',
        'checkin code': 'Check-in Code',
        'review points': 'Review Points',
        'reviewpoints': 'Review Points',
        'latitude': 'Latitude',
        'lat': 'Latitude',
        'longitude': 'Longitude',
        'lng': 'Longitude',
        'long': 'Longitude',
      }
      return headerMap[lower] || header
    }

    const normalizedHeaders = headers.map(normalizeHeader)
    
    // Required columns
    const requiredColumns = ['Event Name', 'Date', 'Address', 'City', 'State', 'Zip Code', 'Brand Name', 'Points']
    const missingColumns = requiredColumns.filter(col => !normalizedHeaders.includes(col))
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    // Parse data rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Handle CSV with quoted fields that may contain commas
      const values: string[] = []
      let currentValue = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      values.push(currentValue.trim()) // Add last value

      // Map values to headers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = {}
      headers.forEach((header, index) => {
        const normalizedHeader = normalizeHeader(header)
        row[normalizedHeader] = values[index]?.replace(/^"|"$/g, '') || ''
      })

      // Only add row if it has required data
      if (row['Event Name'] && row['Date']) {
        data.push(row)
      }
    }

    return data
  }

  // Handle CSV bulk upload
  const handleCSVUpload = async (file: File) => {
    try {
      // Read CSV file
      const csvText = await file.text()
      
      // Parse CSV
      const csvData = parseCSV(csvText)
      
      if (csvData.length === 0) {
        throw new Error('No valid event data found in CSV file')
      }

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      // Process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i]
        try {
          // Map CSV row to event data format
          // Parse date - handle multiple formats: DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
          let eventDate: Date
          const dateStr = row['Date'].trim()
          
          // Try DD-MM-YYYY format (e.g., "20-01-2026")
          if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [day, month, year] = dateStr.split('-').map(Number)
            eventDate = new Date(year, month - 1, day)
          }
          // Try YYYY-MM-DD format (e.g., "2026-01-20")
          else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            eventDate = new Date(dateStr)
          }
          // Try MM/DD/YYYY format (e.g., "01/20/2026")
          else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            eventDate = new Date(dateStr)
          }
          // Fallback to default Date parsing
          else {
            eventDate = new Date(dateStr)
          }
          
          if (isNaN(eventDate.getTime())) {
            throw new Error(`Invalid date format: ${row['Date']}. Expected formats: DD-MM-YYYY, YYYY-MM-DD, or MM/DD/YYYY`)
          }

          // Use times from CSV or default values
          const startTime = row['Start Time']?.trim() || '09:00' // Default start time
          const endTime = row['End Time']?.trim() || '17:00' // Default end time

          // Parse start time (supports HH:MM format)
          const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
            const cleanTime = timeStr.replace(/[APap][Mm]/, '').trim()
            const [h, m] = cleanTime.split(':').map(Number)
            let hours = h
            // Handle AM/PM if present
            if (timeStr.toLowerCase().includes('pm') && hours < 12) hours += 12
            if (timeStr.toLowerCase().includes('am') && hours === 12) hours = 0
            return { hours: hours || 0, minutes: m || 0 }
          }

          const { hours: startHours, minutes: startMinutes } = parseTimeString(startTime)
          const startDateTime = new Date(eventDate)
          startDateTime.setHours(startHours, startMinutes, 0, 0)

          const { hours: endHours, minutes: endMinutes } = parseTimeString(endTime)
          const endDateTime = new Date(eventDate)
          endDateTime.setHours(endHours, endMinutes, 0, 0)

          // Find client by brand name
          let clientId: string | null = null
          if (row['Brand Name']) {
            try {
              const client = await clientsService.findByName(row['Brand Name'].trim())
              clientId = client?.$id || null
              if (!clientId) {
                throw new Error(`Brand "${row['Brand Name']}" not found in database`)
              }
            } catch (brandErr) {
              throw new Error(`Brand lookup failed: ${extractErrorMessage(brandErr)}`)
            }
          }

          // Find category by name if provided
          let categoryId: string | null = null
          if (row['Category']?.trim()) {
            try {
              const category = await categoriesService.findByTitle(row['Category'].trim())
              categoryId = category?.$id || null
            } catch (catErr) {
              console.warn(`Category "${row['Category']}" not found, skipping category assignment`)
            }
          }

          // Parse products (comma-separated) and convert to string format for database
          // Database expects products as a string (max 1000 chars), not an array
          const productsString = row['Products']?.trim() || ''

          // Use check-in code from CSV or generate one
          const checkInCode = row['Check-in Code']?.trim() || `CHK-${Date.now()}-${i}`

          // Parse review points (use Points value as fallback)
          const checkInPoints = parseFloat(row['Points']) || 0
          const reviewPoints = row['Review Points']?.trim() 
            ? parseFloat(row['Review Points']) || 0
            : checkInPoints // Use checkInPoints as default for review points

          // Parse event info or generate default
          const eventInfo = row['Event Info']?.trim() || `Event at ${row['Address'] || row['City'] || 'location'}`

          // Parse discount (now text field)
          const discount = row['Discount']?.trim() || ''
          
          // Get discount image URL if provided
          const discountImageURL = row['Discount Image URL']?.trim() || ''

          // Prepare event payload
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventPayload: any = {
            name: row['Event Name'],
            date: formatDateWithTimezone(eventDate),
            startTime: formatDateWithTimezone(startDateTime),
            endTime: formatDateWithTimezone(endDateTime),
            city: row['City'] || '',
            address: row['Address'] || '',
            state: row['State'] || '',
            zipCode: row['Zip Code'] || '',
            products: productsString,
            checkInCode: checkInCode,
            checkInPoints: checkInPoints,
            reviewPoints: reviewPoints,
            eventInfo: eventInfo,
            isArchived: false,
            isHidden: false,
          }

          // Add discount if provided
          if (discount) {
            eventPayload.discount = discount
          }
          
          // Add discount image URL if provided
          if (discountImageURL) {
            eventPayload.discountImageURL = discountImageURL
          }

          // Add location if latitude and longitude provided
          if (row['Latitude']?.trim() && row['Longitude']?.trim()) {
            const lat = parseFloat(row['Latitude'])
            const lng = parseFloat(row['Longitude'])
            if (!isNaN(lat) && !isNaN(lng)) {
              eventPayload.location = [lng, lat] // Appwrite format: [longitude, latitude]
            }
          }

          // Add client if found
          if (clientId) {
            eventPayload.client = clientId
          }

          // Add category if found
          if (categoryId) {
            eventPayload.categories = categoryId
          }

          // Create event
          console.log(`Creating event for row ${i + 2}:`, eventPayload)
          await eventsService.create(eventPayload)
          successCount++
          console.log(`Successfully created event: ${row['Event Name']}`)
        } catch (err) {
          errorCount++
          const errorMsg = extractErrorMessage(err)
          const errorDetail = `Row ${i + 2} (${row['Event Name'] || 'Unknown'}): ${errorMsg}`
          errors.push(errorDetail)
          console.error(`CSV Upload Error - ${errorDetail}`, err)
        }
      }

      // Show summary notification
      if (successCount > 0 && errorCount === 0) {
        addNotification({
          type: 'success',
          title: 'CSV Upload Successful',
          message: `Successfully created ${successCount} event${successCount > 1 ? 's' : ''} from CSV file.`,
        })
      } else if (successCount > 0 && errorCount > 0) {
        addNotification({
          type: 'warning',
          title: 'Partial CSV Upload',
          message: `Created ${successCount} event${successCount > 1 ? 's' : ''}, but ${errorCount} failed:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n... and ${errors.length - 3} more` : ''}`,
        })
        console.error('CSV Upload Errors (Full List):', errors)
      } else {
        const errorSummary = errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n... and ${errors.length - 3} more errors` : '')
        throw new Error(`Failed to create any events. ${errorCount} error${errorCount > 1 ? 's' : ''} occurred:\n\n${errorSummary}\n\nCheck console for full error details.`)
      }

      // Refresh events list - reset to page 1 after CSV upload
      setCurrentPage(1)
      await fetchEvents(1)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      addNotification({
        type: 'error',
        title: 'CSV Upload Failed',
        message: errorMessage,
      })
      console.error('CSV upload error:', err)
      throw err
    }
  }

  // Handle event creation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreateEvent = async (eventData: any) => {
    try {
      // 1. Upload discount image if provided
      let discountImageURL: string | null = null
      if (eventData.discountImage && eventData.discountImage instanceof File) {
        discountImageURL = await uploadFile(eventData.discountImage)
      }

      // 2. Find category by title (if category is provided)
      let categoryId: string | null = null
      if (eventData.category) {
        const category = await categoriesService.findByTitle(eventData.category)
        categoryId = category?.$id || null
      }

      // 3. Find client by brand name (if brandName is provided)
      let clientId: string | null = null
      if (eventData.brandName) {
        const client = await clientsService.findByName(eventData.brandName)
        clientId = client?.$id || null
        if (!clientId) {
          throw new Error(`Client with name "${eventData.brandName}" not found`)
        }
      }

      // 4. Combine date and time for datetime fields
      const eventDate = new Date(eventData.eventDate)
      const startTimeStr = eventData.startTime // Format: "HH:MM"
      const endTimeStr = eventData.endTime // Format: "HH:MM"

      // Parse start time
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number)
      const startDateTime = new Date(eventDate)
      startDateTime.setHours(startHours, startMinutes, 0, 0)

      // Parse end time
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number)
      const endDateTime = new Date(eventDate)
      endDateTime.setHours(endHours, endMinutes, 0, 0)

      // 5. Prepare event data according to database schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventPayload: any = {
        name: eventData.eventName,
        date: formatDateWithTimezone(eventDate),
        startTime: formatDateWithTimezone(startDateTime),
        endTime: formatDateWithTimezone(endDateTime),
        city: eventData.city,
        address: eventData.address,
        state: eventData.state,
        zipCode: eventData.zipCode,
        products: Array.isArray(eventData.products) 
          ? eventData.products.join(', ') 
          : (eventData.products || ''),
        checkInCode: eventData.checkInCode,
        checkInPoints: parseFloat(eventData.checkInPoints) || 0,
        reviewPoints: parseFloat(eventData.reviewPoints) || 0,
        eventInfo: eventData.eventInfo,
        isArchived: false,
        isHidden: false,
      }

      // Add location as [longitude, latitude] array if both are provided
      if (eventData.longitude && eventData.latitude) {
        eventPayload.location = [
          parseFloat(eventData.longitude),
          parseFloat(eventData.latitude)
        ]
      }

      // Optional fields
      if (categoryId) {
        eventPayload.categories = categoryId
      }

      if (clientId) {
        eventPayload.client = clientId
      }

      if (discountImageURL) {
        eventPayload.discountImageURL = discountImageURL
      }

      // Parse discount as number (if provided)
      if (eventData.discount) {
        const discountValue = parseFloat(eventData.discount)
        if (!isNaN(discountValue)) {
          eventPayload.discount = discountValue
        }
      }

      // 6. Create event
      await eventsService.create(eventPayload)

      // 7. Show success notification
      addNotification({
        type: 'success',
        title: 'Event Created',
        message: `Event "${eventData.eventName}" has been created successfully.`,
      })

      // 8. Refresh events list - reset to page 1 after creating new event
      setCurrentPage(1)
      await fetchEvents(1)

      // 9. Close modal on success (modal will close automatically via onClose in AddEventModal)
    } catch (err) {
      // Extract error message from Appwrite error
      const errorMessage = extractErrorMessage(err)
      
      // Show error notification with actual Appwrite error message
      addNotification({
        type: 'error',
        title: 'Error Creating Event',
        message: errorMessage,
      })
      
      console.error('Error creating event:', err)
      
      // Re-throw error so modal can handle it (keep modal open)
      throw err
    }
  }

  // Handle event update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateEvent = async (eventData: any) => {
    try {
      if (!selectedEventDoc) {
        throw new Error('No event selected for editing')
      }

      const eventId = selectedEventDoc.$id

      // 1. Upload discount image if provided and it's a new file
      let discountImageURL: string | null = null
      if (eventData.discountImage) {
        if (eventData.discountImage instanceof File) {
          // New file uploaded
          discountImageURL = await uploadFile(eventData.discountImage)
        } else if (typeof eventData.discountImage === 'string') {
          // Existing image URL, keep it
          discountImageURL = eventData.discountImage
        }
      }

      // 2. Find category by title (if category is provided)
      let categoryId: string | null = null
      if (eventData.category) {
        const category = await categoriesService.findByTitle(eventData.category)
        categoryId = category?.$id || null
      }

      // 3. Find client by brand name (if brandName is provided)
      let clientId: string | null = null
      if (eventData.brandName) {
        const client = await clientsService.findByName(eventData.brandName)
        clientId = client?.$id || null
        if (!clientId) {
          throw new Error(`Client with name "${eventData.brandName}" not found`)
        }
      }

      // 4. Combine date and time for datetime fields
      const eventDate = new Date(eventData.eventDate)
      const startTimeStr = eventData.startTime // Format: "HH:MM"
      const endTimeStr = eventData.endTime // Format: "HH:MM"

      // Parse start time
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number)
      const startDateTime = new Date(eventDate)
      startDateTime.setHours(startHours, startMinutes, 0, 0)

      // Parse end time
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number)
      const endDateTime = new Date(eventDate)
      endDateTime.setHours(endHours, endMinutes, 0, 0)

      // 5. Prepare event data according to database schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventPayload: any = {
        name: eventData.eventName,
        date: formatDateWithTimezone(eventDate),
        startTime: formatDateWithTimezone(startDateTime),
        endTime: formatDateWithTimezone(endDateTime),
        city: eventData.city,
        address: eventData.address,
        state: eventData.state,
        zipCode: eventData.zipCode,
        products: Array.isArray(eventData.products) 
          ? eventData.products.join(', ') 
          : (eventData.products || ''),
        checkInCode: eventData.checkInCode,
        checkInPoints: parseFloat(eventData.checkInPoints) || 0,
        reviewPoints: parseFloat(eventData.reviewPoints) || 0,
        eventInfo: eventData.eventInfo,
      }

      // Add location as [longitude, latitude] array if both are provided
      if (eventData.longitude && eventData.latitude) {
        eventPayload.location = [
          parseFloat(eventData.longitude),
          parseFloat(eventData.latitude)
        ]
      }

      // Preserve existing status fields
      if (selectedEventDoc.isArchived !== undefined) {
        eventPayload.isArchived = selectedEventDoc.isArchived
      }
      if (selectedEventDoc.isHidden !== undefined) {
        eventPayload.isHidden = selectedEventDoc.isHidden
      }

      // Optional fields
      if (categoryId) {
        eventPayload.categories = categoryId
      } else if (selectedEventDoc.categories) {
        // Keep existing category if no new one provided
        eventPayload.categories = selectedEventDoc.categories
      }

      if (clientId) {
        eventPayload.client = clientId
      } else if (selectedEventDoc.client) {
        // Keep existing client if no new one provided
        eventPayload.client = selectedEventDoc.client
      }

      if (discountImageURL) {
        eventPayload.discountImageURL = discountImageURL
      }

      // Parse discount as number
      if (eventData.discount !== undefined && eventData.discount !== '') {
        const discountValue = parseFloat(eventData.discount)
        if (!isNaN(discountValue)) {
          eventPayload.discount = discountValue
        }
      } else if (selectedEventDoc.discount !== undefined) {
        // Keep existing discount if no new one provided
        eventPayload.discount = selectedEventDoc.discount
      }

      // 6. Update event
      await eventsService.update(eventId, eventPayload)

      // 7. Show success notification
      addNotification({
        type: 'success',
        title: 'Event Updated',
        message: `Event "${eventData.eventName}" has been updated successfully.`,
      })

      // 8. Refresh events list
      await fetchEvents(currentPage)

      // 9. Close modal on success
      setIsEditModalOpen(false)
      setSelectedEvent(null)
      setSelectedEventDoc(null)
      setEditModalInitialData(null)
    } catch (err) {
      // Extract error message from Appwrite error
      const errorMessage = extractErrorMessage(err)
      
      // Show error notification with actual Appwrite error message
      addNotification({
        type: 'error',
        title: 'Error Updating Event',
        message: errorMessage,
      })
      
      console.error('Error updating event:', err)
      
      // Re-throw error so modal can handle it (keep modal open)
      throw err
    }
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await statisticsService.getStatistics<DashboardStats>('dashboard')
      setStatistics(stats)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Statistics',
        message: 'Failed to load dashboard statistics. Please refresh the page.',
      })
    }
  }

  // Map statistics to metrics format
  const metrics = statistics
    ? [
        {
          label: 'Total Clients/Brands',
          value: formatNumber(statistics.totalClientsBrands),
          change: formatPercentage(statistics.totalClientsBrandsChange),
          changeLabel: 'from last month',
          icon: 'mdi:file-document',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
        {
          label: 'Total Points Awarded',
          value: formatNumber(statistics.totalPointsAwarded),
          change: formatPercentage(statistics.totalPointsAwardedChange),
          changeLabel: 'from last month',
          icon: 'mdi:ribbon',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'Total Users', 
          value: formatNumber(statistics.totalUsers),
          change: formatPercentage(statistics.totalUsersChange),
          changeLabel: 'from last month',
          icon: 'mdi:account-group',
          iconBg: 'bg-purple-100',
          iconColor: 'text-[#1D0A74]',
        },
        {
          label: 'Average PPU',
          value: formatNumber(statistics.averagePPU),
          change: formatPercentage(statistics.averagePPUChange),
          changeLabel: 'from last month',
          icon: 'mdi:trending-up',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
        {
          label: 'Total Check-ins',
          value: formatNumber(statistics.totalCheckins),
          change: formatPercentage(statistics.totalCheckinsChange),
          changeLabel: 'from last month',
          icon: 'mdi:check-circle',
          iconBg: 'bg-teal-100',
          iconColor: 'text-teal-600',
        },
        {
          label: 'Reviews',
          value: formatNumber(statistics.reviews),
          change: formatPercentage(statistics.reviewsChange),
          changeLabel: 'from last month',
          icon: 'mdi:star',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
        },
      ]
    : [
        {
          label: 'Total Clients/Brands',
          value: '0',
          change: '+0%',
          changeLabel: 'from last month',
          icon: 'mdi:file-document',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
        {
          label: 'Total Points Awarded',
          value: '0',
          change: '+0%',
          changeLabel: 'from last month',
          icon: 'mdi:ribbon',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'Total Users',
          value: '0',
          change: '+0%',
          changeLabel: 'from last month',
          icon: 'mdi:account-group',
          iconBg: 'bg-purple-100',
          iconColor: 'text-[#1D0A74]',
        },
        {
          label: 'Average PPU',
          value: '0',
          change: '+0%',
          changeLabel: 'from last month',
          icon: 'mdi:trending-up',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
        {
          label: 'Total Check-ins',
          value: '0',
          change: '+0%',
          changeLabel: 'from last month',
          icon: 'mdi:check-circle',
          iconBg: 'bg-teal-100',
          iconColor: 'text-teal-600',
        },
        {
          label: 'Reviews',
          value: '0',
          change: '+0%',
          changeLabel: 'from last month',
          icon: 'mdi:star',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
        },
      ]

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const result = await categoriesService.list()
      setCategories(result.documents as Array<Models.Document & { title: string }>)
    } catch (err) {
      console.error('Error fetching categories:', err)
      // Don't show notification for categories fetch failure
    }
  }

  // Fetch brands/clients
  const fetchBrands = async () => {
    try {
      const result = await clientsService.list()
      setBrands(result.documents as Array<Models.Document & { name: string }>)
    } catch (err) {
      console.error('Error fetching brands:', err)
      // Don't show notification for brands fetch failure
    }
  }

  // Fetch events when filters, search, or sort change
  useEffect(() => {
    setCurrentPage(1) // Reset to first page when filters change
    fetchEvents(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, sortBy, dateRange.start, dateRange.end])

  // Fetch categories, brands, and statistics on component mount
  // OPTIMIZATION: Fetch all initial data in parallel
  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchBrands(),
      fetchStatistics()
    ]).catch(err => {
      console.error('Error fetching initial data:', err)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading && isInitialLoad) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <DashboardHeader />
        <MetricsCards metrics={metrics} />
        <SearchAndFilter
          onDateFilterClick={() => setIsDateFilterOpen(true)}
          dateRange={dateRange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={(value: string) => {
            setSortBy(value)
          }}
        />
        <EventsTable
          events={events}
          currentPage={currentPage}
          totalPages={totalPages}
          totalEvents={totalEvents}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onEventClick={(event) => {
            const eventId = (event as Event & { id?: string }).id
            if (eventId) {
              navigate(`/event-reviews/${eventId}`)
            } else {
              navigate('/event-reviews')
            }
          }}
          onEditClick={async (event: Event) => {
            setSelectedEvent(event as Event)
            setIsEditModalOpen(true)
            setEditModalInitialData(null)
            
            // Fetch full event document for editing
            const eventId = (event as Event & { id?: string }).id
            if (eventId) {
              const eventDoc = await fetchEventForEdit(eventId)
              setSelectedEventDoc(eventDoc)
              
              if (eventDoc) {
                // Format event data for edit modal
                const formattedData = await formatEventForEditModal(eventDoc)
                setEditModalInitialData(formattedData)
              }
            }
          }}
          onHideClick={(event) => {
            const isCurrentlyHidden = event.status === 'Hidden'
            setSelectedEvent(event)
            setConfirmationModal({
              isOpen: true,
              type: isCurrentlyHidden ? 'unhide' : 'hide',
              onConfirm: async () => {
                try {
                  const eventId = (event as Event & { id?: string }).id
                  if (!eventId) {
                    throw new Error('Event ID not found')
                  }
                  await eventsService.update(eventId, { isHidden: !isCurrentlyHidden })
                  addNotification({
                    type: 'success',
                    title: isCurrentlyHidden ? 'Event Unhidden' : 'Event Hidden',
                    message: `Event "${event.venueName}" has been ${isCurrentlyHidden ? 'unhidden' : 'hidden'} successfully.`,
                  })
                  setConfirmationModal({ ...confirmationModal, isOpen: false })
                  await fetchEvents(currentPage)
                } catch (err) {
                  const errorMessage = extractErrorMessage(err)
                  addNotification({
                    type: 'error',
                    title: isCurrentlyHidden ? 'Error Unhiding Event' : 'Error Hiding Event',
                    message: errorMessage,
                  })
                  console.error('Error toggling event visibility:', err)
                }
              },
              itemName: `event "${event.venueName}"`,
            })
          }}
          onDeleteClick={(event) => {
            setSelectedEvent(event)
            setConfirmationModal({
              isOpen: true,
              type: 'delete',
              onConfirm: async () => {
                try {
                  const eventId = (event as Event & { id?: string }).id
                  if (!eventId) {
                    throw new Error('Event ID not found')
                  }
                  await eventsService.delete(eventId)
                  addNotification({
                    type: 'success',
                    title: 'Event Deleted',
                    message: `Event "${event.venueName}" has been deleted successfully.`,
                  })
                  setConfirmationModal({ ...confirmationModal, isOpen: false })
                  await fetchEvents(currentPage)
                } catch (err) {
                  const errorMessage = extractErrorMessage(err)
                  addNotification({
                    type: 'error',
                    title: 'Error Deleting Event',
                    message: errorMessage,
                  })
                  console.error('Error deleting event:', err)
                }
              },
              itemName: `event "${event.venueName}"`,
            })
          }}
          onCSVUpload={() => setIsCSVUploadOpen(true)}
          onNewEvent={() => setIsModalOpen(true)}
        />
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateEvent}
        categories={categories}
        brands={brands}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedEvent(null)
          setSelectedEventDoc(null)
          setEditModalInitialData(null)
        }}
        onSave={handleUpdateEvent}
        eventId={selectedEventDoc?.$id}
        onShowArchiveConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'archive',
            onConfirm: async () => {
              try {
                const eventId = selectedEventDoc?.$id || (selectedEvent as Event & { id?: string })?.id
                if (!eventId) {
                  throw new Error('Event ID not found')
                }
                await eventsService.update(eventId, { isArchived: true })
                addNotification({
                  type: 'success',
                  title: 'Event Archived',
                  message: `Event has been archived successfully.`,
                })
                setConfirmationModal({ ...confirmationModal, isOpen: false })
                setIsEditModalOpen(false)
                setSelectedEvent(null)
                setSelectedEventDoc(null)
                setEditModalInitialData(null)
                await fetchEvents(currentPage)
              } catch (err) {
                const errorMessage = extractErrorMessage(err)
                addNotification({
                  type: 'error',
                  title: 'Error Archiving Event',
                  message: errorMessage,
                })
                console.error('Error archiving event:', err)
              }
            },
            itemName: 'this event',
          })
        }}
        onShowHideConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'hide',
            onConfirm: async () => {
              try {
                const eventId = selectedEventDoc?.$id || (selectedEvent as Event & { id?: string })?.id
                if (!eventId) {
                  throw new Error('Event ID not found')
                }
                await eventsService.update(eventId, { isHidden: true })
                addNotification({
                  type: 'success',
                  title: 'Event Hidden',
                  message: `Event has been hidden successfully.`,
                })
                setConfirmationModal({ ...confirmationModal, isOpen: false })
                setIsEditModalOpen(false)
                setSelectedEvent(null)
                setSelectedEventDoc(null)
                setEditModalInitialData(null)
                await fetchEvents(currentPage)
              } catch (err) {
                const errorMessage = extractErrorMessage(err)
                addNotification({
                  type: 'error',
                  title: 'Error Hiding Event',
                  message: errorMessage,
                })
                console.error('Error hiding event:', err)
              }
            },
            itemName: 'this event',
          })
        }}
        onShowDeleteConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'delete',
            onConfirm: async () => {
              try {
                const eventId = selectedEventDoc?.$id || (selectedEvent as Event & { id?: string })?.id
                if (!eventId) {
                  throw new Error('Event ID not found')
                }
                await eventsService.delete(eventId)
                addNotification({
                  type: 'success',
                  title: 'Event Deleted',
                  message: `Event has been deleted successfully.`,
                })
                setConfirmationModal({ ...confirmationModal, isOpen: false })
                setIsEditModalOpen(false)
                setSelectedEvent(null)
                setSelectedEventDoc(null)
                setEditModalInitialData(null)
                await fetchEvents(currentPage)
              } catch (err) {
                const errorMessage = extractErrorMessage(err)
                addNotification({
                  type: 'error',
                  title: 'Error Deleting Event',
                  message: errorMessage,
                })
                console.error('Error deleting event:', err)
              }
            },
            itemName: 'this event',
          })
        }}
        initialData={editModalInitialData || undefined}
        categories={categories}
        brands={brands}
      />

      {/* Date Filter Modal */}
      <DateFilterModal
        isOpen={isDateFilterOpen}
        onClose={() => setIsDateFilterOpen(false)}
        onSelect={(startDate: Date | null, endDate: Date | null) => {
          setDateRange({ start: startDate, end: endDate })
          // Date filter is automatically applied via useEffect
        }}
        initialStartDate={dateRange.start}
        initialEndDate={dateRange.end}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVUploadOpen}
        onClose={() => setIsCSVUploadOpen(false)}
        onUpload={handleCSVUpload}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        onConfirm={confirmationModal.onConfirm}
        type={confirmationModal.type}
        itemName={confirmationModal.itemName}
      />
    </DashboardLayout>
  )
}

export default Dashboard

