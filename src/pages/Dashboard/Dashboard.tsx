import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Models } from 'appwrite'
import { DashboardLayout, ShimmerPage, ConfirmationModal } from '../../components'
import type { ConfirmationType } from '../../components'
import { eventsService, categoriesService, clientsService } from '../../lib/services'
import { storage, appwriteConfig, ID } from '../../lib/appwrite'
import { useNotificationStore } from '../../stores/notificationStore'
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

// Event document interface from database
interface EventDocument extends Models.Document {
  eventName?: string
  eventDate?: string
  startTime?: string
  endTime?: string
  brandName?: string
  discount?: boolean | string
  status?: string
  venueName?: string
  [key: string]: any
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [categories, setCategories] = useState<Array<Models.Document & { title: string }>>([])
  const [brands, setBrands] = useState<Array<Models.Document & { name: string }>>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
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

  // Helper function to map database event document to EventsTable format
  const mapEventDocumentToEvent = (doc: EventDocument): Event => {
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

    // Determine status color based on status value
    const getStatusColor = (status?: string): string => {
      const statusLower = status?.toLowerCase() || ''
      if (statusLower === 'active') {
        return 'bg-green-100 text-green-800'
      } else if (statusLower === 'inactive' || statusLower === 'hidden') {
        return 'bg-red-100 text-red-800'
      } else if (statusLower === 'archived') {
        return 'bg-gray-100 text-gray-800'
      }
      return 'bg-gray-100 text-gray-800'
    }

    // Convert discount boolean/string to "YES"/"NO"
    const formatDiscount = (discount?: boolean | string): string => {
      if (discount === undefined || discount === null) return 'NO'
      if (typeof discount === 'boolean') {
        return discount ? 'YES' : 'NO'
      }
      if (typeof discount === 'string') {
        const lower = discount.toLowerCase()
        return lower === 'yes' || lower === 'true' ? 'YES' : 'NO'
      }
      return 'NO'
    }

    return {
      id: doc.$id,
      date: formatDate(doc.eventDate || doc.date),
      venueName: doc.venueName || doc.eventName || '',
      brand: doc.brandName || doc.brand || '',
      startTime: formatTime(doc.startTime),
      endTime: formatTime(doc.endTime),
      discount: formatDiscount(doc.discount),
      status: doc.status || 'Inactive',
      statusColor: getStatusColor(doc.status),
    }
  }

  // Fetch events from database
  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      
      const result = await eventsService.list()
      const mappedEvents = result.documents.map(mapEventDocumentToEvent)
      setEvents(mappedEvents)
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
            date: eventDate.toISOString(),
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
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
            isHidder: false,
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

      // Refresh events list
      await fetchEvents()
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
        date: eventDate.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
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
        isArchived: false,
        isHidder: false,
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

      // 8. Refresh events list
      await fetchEvents()

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

  const metrics = [
    {
      label: 'Total Clients/Brands',
      value: '173',
      change: '+12%',
      changeLabel: 'from last month',
      icon: 'mdi:file-document',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total Points Awarded',
      value: '134,215',
      change: '+8%',
      changeLabel: 'from last month',
      icon: 'mdi:ribbon',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Total Users',
      value: '5,000',
      change: '+15%',
      changeLabel: 'from last month',
      icon: 'mdi:account-group',
      iconBg: 'bg-purple-100',
      iconColor: 'text-[#1D0A74]',
    },
    {
      label: 'Average PPU',
      value: '925',
      change: '+5%',
      changeLabel: 'from last month',
      icon: 'mdi:trending-up',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Total Check-ins',
      value: '13,000',
      change: '+10%',
      changeLabel: 'from last month',
      icon: 'mdi:check-circle',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Reviews',
      value: '11,520',
      change: '+7%',
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

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents()
    fetchCategories()
    fetchBrands()
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
        />
        <EventsTable
          events={events}
          onEventClick={() => navigate('/event-reviews')}
          onEditClick={(event) => {
            setSelectedEvent(event)
            setIsEditModalOpen(true)
          }}
          onViewClick={() => navigate('/event-reviews')}
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
        }}
        onSave={(eventData) => {
          console.log('Updated event data:', eventData)
          // TODO: Implement update functionality
          setIsEditModalOpen(false)
          setSelectedEvent(null)
        }}
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
        initialData={
          selectedEvent
            ? {
                eventName: selectedEvent.venueName,
                eventDate: selectedEvent.date,
                startTime: selectedEvent.startTime,
                endTime: selectedEvent.endTime,
                city: 'New York',
                discount: selectedEvent.discount === 'YES' ? 'Yes' : 'No',
                productTypes: ['Product 1', 'Product 2', 'Lana'],
                products: ['Snack'],
                eventInfo: 'Great Event at Brighton Beach',
              }
            : undefined
        }
      />

      {/* Date Filter Modal */}
      <DateFilterModal
        isOpen={isDateFilterOpen}
        onClose={() => setIsDateFilterOpen(false)}
        onSelect={(startDate: Date | null, endDate: Date | null) => {
          setDateRange({ start: startDate, end: endDate })
          // TODO: Apply date filter to events
          console.log('Date range selected:', { startDate, endDate })
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

