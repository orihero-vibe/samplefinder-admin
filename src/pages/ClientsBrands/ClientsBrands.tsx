import { useEffect, useState } from 'react'
import {
  ConfirmationModal,
  DashboardLayout,
  ShimmerPage,
} from '../../components'
import { Query, storage, appwriteConfig, ID } from '../../lib/appwrite'
import { clientsService, statisticsService, type ClientDocument, type ClientsStats } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'
import {
  AddClientModal,
  ClientsBrandsHeader,
  ClientsTable,
  EditClientModal,
  SearchAndFilter,
  SummaryCards,
} from './components'

// UI Client interface (for display and table)
interface UIClient {
  id?: string
  clientName: string
  totalEvents: number
  numberOfFavorites: number
  numberOfCheckIns: number
  totalPoints: number
  joinDate: string
  productTypes?: string[]
  logoUrl?: string
  city?: string
  address?: string
  state?: string
  zip?: string
  latitude?: number
  longitude?: number
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

const ClientsBrands = () => {
  const { addNotification } = useNotificationStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<UIClient | null>(null)
  const [clientToDelete, setClientToDelete] = useState<UIClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Transform ClientDocument to UIClient for display
  const transformToUIClient = (doc: ClientDocument): UIClient => {
    // Extract latitude and longitude from location point [longitude, latitude]
    let latitude: number | undefined = undefined
    let longitude: number | undefined = undefined
    if (doc.location && Array.isArray(doc.location) && doc.location.length === 2) {
      longitude = doc.location[0] // First element is longitude
      latitude = doc.location[1] // Second element is latitude
    }

    return {
      id: doc.$id,
      clientName: doc.name,
      totalEvents: 0, // TODO: Calculate from events
      numberOfFavorites: 0, // TODO: Calculate from favorites
      numberOfCheckIns: 0, // TODO: Calculate from check-ins
      totalPoints: 0, // TODO: Calculate total points
      joinDate: doc.$createdAt ? new Date(doc.$createdAt).toLocaleDateString() : '',
      productTypes: doc.productType || [],
      logoUrl: doc.logoURL,
      city: doc.city,
      address: doc.address,
      state: doc.state,
      zip: doc.zip,
      latitude,
      longitude,
    }
  }

  const [clients, setClients] = useState<UIClient[]>([])
  const [statistics, setStatistics] = useState<ClientsStats | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalClients, setTotalClients] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('$createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch clients from Appwrite with pagination, search, and sorting
  const fetchClients = async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Build base queries
      const queries: string[] = []
      
      // Apply search using Query.contains with Query.or (doesn't require fulltext indexes)
      if (searchTerm.trim()) {
        const trimmedSearch = searchTerm.trim()
        // Use Query.or to search across multiple fields
        queries.push(
          Query.or([
            Query.contains('name', trimmedSearch),
            Query.contains('city', trimmedSearch),
            Query.contains('state', trimmedSearch),
            Query.contains('address', trimmedSearch),
          ])
        )
      }
      
      // Apply sorting
      const orderMethod = sortOrder === 'asc' ? Query.orderAsc : Query.orderDesc
      if (sortBy === 'name') {
        queries.push(orderMethod('name'))
      } else if (sortBy === '$createdAt') {
        queries.push(orderMethod('$createdAt'))
      } else if (sortBy === 'city') {
        queries.push(orderMethod('city'))
      }
      
      // Add pagination
      queries.push(Query.limit(pageSize))
      queries.push(Query.offset((page - 1) * pageSize))
      
      // Fetch clients with search, filters, and pagination
      const result = await clientsService.list(queries)
      
      // Extract pagination metadata
      const total = result.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalClients(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        if (page !== lastValidPage) {
          return fetchClients(lastValidPage)
        }
      } else if (totalPagesCount === 0) {
        setCurrentPage(1)
      }
      
      const transformedClients = result.documents.map(transformToUIClient)
      setClients(transformedClients)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError('Failed to load clients. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchClients(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to page 1 when search changes
  }

  // Handle sort by change
  const handleSortByChange = (value: string) => {
    setSortBy(value)
    setCurrentPage(1) // Reset to page 1 when sort changes
  }

  // Handle sort order change
  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setSortOrder(order)
    setCurrentPage(1) // Reset to page 1 when sort order changes
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await statisticsService.getStatistics<ClientsStats>('clients')
      setStatistics(stats)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Statistics',
        message: 'Failed to load clients statistics. Please refresh the page.',
      })
    }
  }

  useEffect(() => {
    fetchClients(1)
    fetchStatistics()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch clients when search, sort, or sort order changes
  useEffect(() => {
    fetchClients(1)
  }, [searchTerm, sortBy, sortOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  // Map statistics to summary cards format
  const summaryCards = statistics
    ? [
        {
          label: 'Total Clients',
          value: statistics.totalClients.toLocaleString('en-US'),
          icon: 'mdi:format-list-bulleted',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'New This Month',
          value: statistics.newThisMonth.toLocaleString('en-US'),
          icon: 'mdi:chart-line',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
      ]
    : [
        {
          label: 'Total Clients',
          value: '0',
          icon: 'mdi:format-list-bulleted',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'New This Month',
          value: '0',
          icon: 'mdi:chart-line',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
      ]

  const handleEditClick = (client: UIClient) => {
    setSelectedClient(client)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (client: UIClient) => {
    setClientToDelete(client)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (clientToDelete?.id) {
      try {
        await clientsService.delete(clientToDelete.id)
        // Check if we need to go back a page if current page becomes empty
        if (clients.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
          await fetchClients(currentPage - 1)
        } else {
          await fetchClients(currentPage) // Refresh list
        }
        setClientToDelete(null)
      } catch (err) {
        console.error('Error deleting client:', err)
        setError('Failed to delete client. Please try again.')
      }
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

  const handleCreateClient = async (clientData: {
    logo: File | null
    clientName: string
    productTypes: string[]
    city?: string
    address?: string
    state?: string
    zip?: string
    location?: [number, number] // Point format: [longitude, latitude]
  }) => {
    try {
      // Upload logo if provided
      let logoURL: string | undefined = undefined
      if (clientData.logo && clientData.logo instanceof File) {
        logoURL = await uploadFile(clientData.logo) || undefined
      }

      // Transform data to match ClientFormData interface
      const formData: {
        name: string
        productType: string[]
        city?: string
        address?: string
        state?: string
        zip?: string
        longitude?: number
        latitude?: number
        logoURL?: string
      } = {
        name: clientData.clientName,
        productType: clientData.productTypes,
        city: clientData.city,
        address: clientData.address,
        state: clientData.state,
        zip: clientData.zip,
        longitude: clientData.location?.[0],
        latitude: clientData.location?.[1],
        logoURL,
      }
      
      await clientsService.create(formData)
      setCurrentPage(1)
      await fetchClients(1) // Refresh list - reset to page 1 after creating
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Client Created',
        message: 'The client has been successfully created.',
      })
      
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error creating client:', err)
      
      // Extract error message from Appwrite error
      const errorMessage = extractErrorMessage(err)
      
      // Show error notification with actual error message
      addNotification({
        type: 'error',
        title: 'Failed to Create Client',
        message: errorMessage,
      })
      
      // Re-throw error so modal can handle it (keep modal open)
      throw err
    }
  }

  const handleUpdateClient = async (clientData: {
    logo: File | null
    clientName: string
    productTypes: string[]
    city?: string
    address?: string
    state?: string
    zip?: string
    location?: [number, number] // Point format: [longitude, latitude]
  }) => {
    if (!selectedClient?.id) return

    try {
      // Upload logo if a new one is provided
      let logoURL: string | undefined = undefined
      if (clientData.logo && clientData.logo instanceof File) {
        logoURL = await uploadFile(clientData.logo) || undefined
      }

      // Transform data to match ClientFormData interface
      const formData: Partial<{
        name: string
        productType: string[]
        city?: string
        address?: string
        state?: string
        zip?: string
        longitude?: number
        latitude?: number
        logoURL?: string
      }> = {
        name: clientData.clientName,
        productType: clientData.productTypes,
        city: clientData.city,
        address: clientData.address,
        state: clientData.state,
        zip: clientData.zip,
        longitude: clientData.location?.[0],
        latitude: clientData.location?.[1],
      }

      // Only include logoURL if a new logo was uploaded
      if (logoURL) {
        formData.logoURL = logoURL
      }
      
      await clientsService.update(selectedClient.id, formData)
      await fetchClients(currentPage) // Refresh list - keep current page
      setIsEditModalOpen(false)
      setSelectedClient(null)
    } catch (err) {
      console.error('Error updating client:', err)
      setError('Failed to update client. Please try again.')
    }
  }

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
        <ClientsBrandsHeader onAddClient={() => setIsModalOpen(true)} />
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        <SummaryCards cards={summaryCards} />
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortByChange={handleSortByChange}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
        />
        <ClientsTable
          clients={clients}
          currentPage={currentPage}
          totalPages={totalPages}
          totalClients={totalClients}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateClient}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedClient(null)
        }}
        onSave={handleUpdateClient}
        initialData={
          selectedClient
            ? {
                clientName: selectedClient.clientName,
                productTypes: selectedClient.productTypes || [],
                logoUrl: selectedClient.logoUrl,
                city: selectedClient.city,
                address: selectedClient.address,
                state: selectedClient.state,
                zip: selectedClient.zip,
                latitude: selectedClient.latitude,
                longitude: selectedClient.longitude,
              }
            : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setClientToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        type="delete"
        itemName="client"
      />
    </DashboardLayout>
  )
}

export default ClientsBrands

