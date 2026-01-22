import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Models } from 'appwrite'
import { DashboardLayout, ShimmerPage, ConfirmationModal } from '../../components'
import type { ConfirmationType } from '../../components'
import { eventsService, categoriesService, clientsService, statisticsService, type DashboardStats } from '../../lib/services'
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
  radius?: number // Radius field from database
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
    productTypes?: string[]
    products?: string[]
    discount?: string
    discountImage?: File | string | null
    discountLink?: string
    checkInCode?: string
    brandName?: string
    checkInPoints?: string
    reviewPoints?: string
    eventInfo?: string
    radius?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
  const [sortBy, setSortBy] = useState<string>('date') // 'date', 'name', 'brand'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
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

    // Format time from HH:MM or ISO string to 12-hour format
    const formatTime = (timeStr?: string): string => {
      if (!timeStr) return ''
      // If it's already in HH:MM format, format it
      if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':')
        const hour = parseInt(hours, 10)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`
      }
      return timeStr
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
      radius: typeof doc.radius === 'number' ? doc.radius : undefined,
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
      
      // Apply sorting
      const orderMethod = sortOrder === 'asc' ? Query.orderAsc : Query.orderDesc
      if (sortBy === 'date') {
        queries.push(orderMethod('date'))
      } else if (sortBy === 'name') {
        queries.push(orderMethod('name'))
      } else if (sortBy === 'brand') {
        // For brand sorting, we'll sort by date first, then handle brand sorting client-side
        // since brand is a relationship field
        queries.push(orderMethod('date'))
      }
      
      // Add pagination
      queries.push(Query.limit(pageSize))
      queries.push(Query.offset((page - 1) * pageSize))
      
      // Fetch events with filters and pagination
      // Use search service if search term exists, otherwise use list service
      const result = searchTerm.trim() 
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
      
      // Map events and fetch client names
      const mappedEventsPromises = result.documents.map(async (doc) => {
        const event = mapEventDocumentToEvent(doc as unknown as LocalEventDocument)
        
        // Fetch client name if client relationship exists
        if (doc.client) {
          try {
            const client = await clientsService.getById(doc.client as string)
            event.brand = client.name || ''
          } catch (err) {
            console.error('Error fetching client:', err)
          }
        }
        
        return event
      })
      
      let mappedEvents = await Promise.all(mappedEventsPromises)
      
      // Apply client-side brand sorting if needed (since brand is a relationship)
      if (sortBy === 'brand') {
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

    // Parse products string to array
    const productsArray = eventDoc.products
      ? eventDoc.products.split(',').map(p => p.trim()).filter(p => p)
      : ['']

    // Convert discount number to "Yes"/"No" format for the select dropdown
    const formatDiscount = (discount?: number): string => {
      if (discount === undefined || discount === null) return ''
      return discount > 0 ? 'Yes' : 'No'
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
      productTypes: eventDoc.productType || [],
      products: productsArray.length > 0 ? productsArray : [''],
      discount: formatDiscount(eventDoc.discount),
      discountImage: eventDoc.discountImageURL || null,
      discountLink: '', // Not in database schema
      checkInCode: eventDoc.checkInCode || '',
      brandName: brandName,
      checkInPoints: eventDoc.checkInPoints?.toString() || '',
      reviewPoints: eventDoc.reviewPoints?.toString() || '',
      eventInfo: eventDoc.eventInfo || '',
      radius: eventDoc.radius?.toString() || '',
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
        'product': 'Product',
        'products': 'Product',
        'brand name': 'Brand Name',
        'brandname': 'Brand Name',
        'brand': 'Brand Name',
        'points': 'Points',
        'point': 'Points',
      }
      return headerMap[lower] || header
    }

    const normalizedHeaders = headers.map(normalizeHeader)
    
    // Required columns
    const requiredColumns = ['Event Name', 'Date', 'Address', 'City', 'State', 'Zip Code', 'Product', 'Brand Name', 'Points']
    const missingColumns = requiredColumns.filter(col => !normalizedHeaders.includes(col))
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    // Parse data rows
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
          const eventDate = new Date(row['Date'])
          if (isNaN(eventDate.getTime())) {
            throw new Error(`Invalid date format in row ${i + 2}: ${row['Date']}`)
          }

          // Default times (can be extended if CSV includes time columns)
          const startTime = '09:00' // Default start time
          const endTime = '17:00' // Default end time

          // Parse start time
          const [startHours, startMinutes] = startTime.split(':').map(Number)
          const startDateTime = new Date(eventDate)
          startDateTime.setHours(startHours, startMinutes, 0, 0)

          // Parse end time
          const [endHours, endMinutes] = endTime.split(':').map(Number)
          const endDateTime = new Date(eventDate)
          endDateTime.setHours(endHours, endMinutes, 0, 0)

          // Find client by brand name
          let clientId: string | null = null
          if (row['Brand Name']) {
            const client = await clientsService.findByName(row['Brand Name'])
            clientId = client?.$id || null
            if (!clientId) {
              throw new Error(`Brand "${row['Brand Name']}" not found`)
            }
          }

          // Prepare event payload
          const eventPayload: any = {
            name: row['Event Name'],
            date: formatDateWithTimezone(eventDate),
            startTime: formatDateWithTimezone(startDateTime),
            endTime: formatDateWithTimezone(endDateTime),
            city: row['City'] || '',
            address: row['Address'] || '',
            state: row['State'] || '',
            zipCode: row['Zip Code'] || '',
            productType: [],
            products: row['Product'] || '',
            checkInCode: `CHK-${Date.now()}-${i}`, // Generate unique check-in code
            checkInPoints: parseFloat(row['Points']) || 0,
            reviewPoints: parseFloat(row['Points']) || 0, // Use same points for review
            eventInfo: `Event at ${row['Address'] || row['City'] || 'location'}`,
            isArchived: false,
            isHidden: false,
          }

          // Add client if found
          if (clientId) {
            eventPayload.client = clientId
          }

          // Create event
          await eventsService.create(eventPayload)
          successCount++
        } catch (err) {
          errorCount++
          const errorMsg = extractErrorMessage(err)
          errors.push(`Row ${i + 2} (${row['Event Name'] || 'Unknown'}): ${errorMsg}`)
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
          type: 'error',
          title: 'Partial CSV Upload',
          message: `Created ${successCount} event${successCount > 1 ? 's' : ''}, but ${errorCount} failed. Check console for details.`,
        })
        console.error('CSV Upload Errors:', errors)
      } else {
        throw new Error(`Failed to create any events. ${errorCount} error${errorCount > 1 ? 's' : ''} occurred.`)
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
      const eventPayload: any = {
        name: eventData.eventName,
        date: formatDateWithTimezone(eventDate),
        startTime: formatDateWithTimezone(startDateTime),
        endTime: formatDateWithTimezone(endDateTime),
        city: eventData.city,
        address: eventData.address,
        state: eventData.state,
        zipCode: eventData.zipCode,
        productType: eventData.productTypes || [],
        products: Array.isArray(eventData.products)
          ? eventData.products.filter((p: string) => p.trim()).join(', ')
          : eventData.products || '',
        checkInCode: eventData.checkInCode,
        checkInPoints: parseFloat(eventData.checkInPoints) || 0,
        reviewPoints: parseFloat(eventData.reviewPoints) || 0,
        eventInfo: eventData.eventInfo,
        radius: parseInt(eventData.radius) || 0,
        isArchived: false,
        isHidden: false,
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
      const eventPayload: any = {
        name: eventData.eventName,
        date: formatDateWithTimezone(eventDate),
        startTime: formatDateWithTimezone(startDateTime),
        endTime: formatDateWithTimezone(endDateTime),
        city: eventData.city,
        address: eventData.address,
        state: eventData.state,
        zipCode: eventData.zipCode,
        productType: eventData.productTypes || [],
        products: Array.isArray(eventData.products)
          ? eventData.products.filter((p: string) => p.trim()).join(', ')
          : eventData.products || '',
        checkInCode: eventData.checkInCode,
        checkInPoints: parseFloat(eventData.checkInPoints) || 0,
        reviewPoints: parseFloat(eventData.reviewPoints) || 0,
        eventInfo: eventData.eventInfo,
        radius: parseInt(eventData.radius) || 0,
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

      // Parse discount - convert "Yes"/"No" to number, or keep existing value
      if (eventData.discount) {
        if (eventData.discount === 'Yes') {
          eventPayload.discount = 1 // Or any positive number to indicate discount exists
        } else if (eventData.discount === 'No') {
          eventPayload.discount = 0
        } else {
          // Try to parse as number if it's a numeric string
          const discountValue = parseFloat(eventData.discount)
          if (!isNaN(discountValue)) {
            eventPayload.discount = discountValue
          }
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
  }, [searchTerm, statusFilter, sortBy, sortOrder, dateRange.start, dateRange.end])

  // Fetch categories, brands, and statistics on component mount
  useEffect(() => {
    fetchCategories()
    fetchBrands()
    fetchStatistics()
  }, [])

  if (isLoading) {
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
            // Toggle sort order when clicking same sort option, or default to desc for date, asc for others
            if (value === sortBy) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
            } else {
              setSortOrder(value === 'date' ? 'desc' : 'asc')
            }
          }}
          sortOrder={sortOrder}
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
            setSelectedEvent(event)
            setConfirmationModal({
              isOpen: true,
              type: 'hide',
              onConfirm: () => {
                console.log('Hide event:', event)
                // TODO: Implement hide functionality
              },
              itemName: `event "${event.venueName}"`,
            })
          }}
          onDeleteClick={(event) => {
            setSelectedEvent(event)
            setConfirmationModal({
              isOpen: true,
              type: 'delete',
              onConfirm: () => {
                console.log('Delete event:', event)
                // TODO: Implement delete functionality
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
        onShowArchiveConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'archive',
            onConfirm: () => {
              console.log('Archive event:', selectedEvent)
              // TODO: Implement archive functionality
              setIsEditModalOpen(false)
              setSelectedEvent(null)
            },
            itemName: 'this event',
          })
        }}
        onShowHideConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'hide',
            onConfirm: () => {
              console.log('Hide event:', selectedEvent)
              // TODO: Implement hide functionality
              setIsEditModalOpen(false)
              setSelectedEvent(null)
            },
            itemName: 'this event',
          })
        }}
        onShowDeleteConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'delete',
            onConfirm: () => {
              console.log('Delete event:', selectedEvent)
              // TODO: Implement delete functionality
              setIsEditModalOpen(false)
              setSelectedEvent(null)
            },
            itemName: 'this event',
          })
        }}
        initialData={editModalInitialData || undefined}
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

