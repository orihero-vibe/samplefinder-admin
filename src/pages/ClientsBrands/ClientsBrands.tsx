import { useState, useEffect } from 'react'
import {
  DashboardLayout,
  ConfirmationModal,
  ShimmerPage,
} from '../../components'
import {
  ClientsBrandsHeader,
  SummaryCards,
  SearchAndFilter,
  ClientsTable,
  AddClientModal,
  EditClientModal,
} from './components'
import { clientsService, type ClientDocument } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'

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
      latitude: doc.latitude,
      longitude: doc.longitude,
    }
  }

  // Fetch clients from Appwrite
  const fetchClients = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await clientsService.list()
      const transformedClients = result.documents.map(transformToUIClient)
      setClients(transformedClients)
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError('Failed to load clients. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const [clients, setClients] = useState<UIClient[]>([])

  useEffect(() => {
    fetchClients()
  }, [])

  // Calculate summary statistics
  const totalClients = clients.length
  const newThisMonth = clients.filter((client) => {
    if (!client.joinDate) return false
    const joinDate = new Date(client.joinDate)
    const now = new Date()
    return (
      joinDate.getMonth() === now.getMonth() &&
      joinDate.getFullYear() === now.getFullYear()
    )
  }).length

  const summaryCards = [
    {
      label: 'Total Clients',
      value: totalClients.toString(),
      icon: 'mdi:format-list-bulleted',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'New This Month',
      value: newThisMonth.toString(),
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
        await fetchClients() // Refresh list
        setClientToDelete(null)
      } catch (err) {
        console.error('Error deleting client:', err)
        setError('Failed to delete client. Please try again.')
      }
    }
  }

  const handleCreateClient = async (clientData: {
    logo: File | null
    clientName: string
    productTypes: string[]
    latitude?: number
    longitude?: number
  }) => {
    try {
      await clientsService.create(clientData)
      await fetchClients() // Refresh list
      
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
    latitude?: number
    longitude?: number
  }) => {
    if (!selectedClient?.id) return

    try {
      const existingClient = await clientsService.getById(selectedClient.id)
      await clientsService.update(selectedClient.id, clientData, existingClient)
      await fetchClients() // Refresh list
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
        <SearchAndFilter />
        <ClientsTable
          clients={clients}
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

