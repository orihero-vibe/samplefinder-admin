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

interface Client {
  id?: string
  clientName: string
  totalEvents: number
  numberOfFavorites: number
  numberOfCheckIns: number
  totalPoints: number
  joinDate: string
  productTypes?: string[]
  logoUrl?: string
}

const ClientsBrands = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const summaryCards = [
    {
      label: 'Total Clients',
      value: '250',
      icon: 'mdi:format-list-bulleted',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'New This Month',
      value: '167',
      icon: 'mdi:chart-line',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ]

  const [clients, setClients] = useState<Client[]>([
    {
      clientName: 'Glossier',
      totalEvents: 500,
      numberOfFavorites: 500,
      numberOfCheckIns: 500,
      totalPoints: 12,
      joinDate: '05/15/2020',
      productTypes: ['Product 1', 'Product 2'],
    },
    {
      clientName: 'Chanel',
      totalEvents: 750,
      numberOfFavorites: 750,
      numberOfCheckIns: 750,
      totalPoints: 24,
      joinDate: '05/15/2020',
      productTypes: ['Product 1'],
    },
    {
      clientName: 'The Ordinary',
      totalEvents: 600,
      numberOfFavorites: 600,
      numberOfCheckIns: 600,
      totalPoints: 32,
      joinDate: '05/15/2020',
      productTypes: ['Product 2'],
    },
    {
      clientName: 'Fenty Beauty',
      totalEvents: 400,
      numberOfFavorites: 400,
      numberOfCheckIns: 400,
      totalPoints: 43,
      joinDate: '05/15/2020',
      productTypes: ['Product 1', 'Product 2'],
    },
    {
      clientName: 'Glossier',
      totalEvents: 300,
      numberOfFavorites: 300,
      numberOfCheckIns: 300,
      totalPoints: 87,
      joinDate: '05/15/2020',
      productTypes: ['Product 1'],
    },
    {
      clientName: 'Chanel',
      totalEvents: 200,
      numberOfFavorites: 200,
      numberOfCheckIns: 200,
      totalPoints: 68,
      joinDate: '05/15/2020',
      productTypes: ['Product 2'],
    },
    {
      clientName: 'The Ordinary',
      totalEvents: 500,
      numberOfFavorites: 500,
      numberOfCheckIns: 500,
      totalPoints: 43,
      joinDate: '05/15/2020',
      productTypes: ['Product 1', 'Product 2'],
    },
    {
      clientName: 'Fenty Beauty',
      totalEvents: 400,
      numberOfFavorites: 400,
      numberOfCheckIns: 400,
      totalPoints: 21,
      joinDate: '05/15/2020',
      productTypes: ['Product 1'],
    },
  ])

  const handleEditClick = (client: Client) => {
    setSelectedClient(client)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (clientToDelete) {
      setClients((prev) =>
        prev.filter((client) => client.clientName !== clientToDelete.clientName)
      )
      setClientToDelete(null)
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
        onSave={(clientData) => {
          console.log('Client data:', clientData)
          // TODO: Handle saving client data (e.g., API call)
          // After successful save, you might want to refresh the clients list
        }}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedClient(null)
        }}
        onSave={(clientData) => {
          console.log('Updated client data:', clientData)
          // TODO: Handle updating client data (e.g., API call)
          // After successful update, you might want to refresh the clients list
          if (selectedClient) {
            const updatedClients = clients.map((client) =>
              client.clientName === selectedClient.clientName
                ? { ...client, ...clientData }
                : client
            )
            setClients(updatedClients)
          }
          setIsEditModalOpen(false)
          setSelectedClient(null)
        }}
        initialData={
          selectedClient
            ? {
                clientName: selectedClient.clientName,
                productTypes: selectedClient.productTypes || [],
                logoUrl: selectedClient.logoUrl,
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

