import { useState, useEffect } from 'react'
import {
  DashboardLayout,
  ConfirmationModal,
  ShimmerPage,
} from '../../components'
import {
  CategoriesHeader,
  SummaryCards,
  SearchAndFilter,
  CategoriesTable,
  AddCategoryModal,
  EditCategoryModal,
} from './components'
import { categoriesService, type CategoryDocument } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'
import { Query } from '../../lib/appwrite'
import { Pagination } from '../../components'

// UI Category interface (for display and table)
interface UICategory {
  id?: string
  title: string
  isAdult?: boolean
  createdAt?: string
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

const Categories = () => {
  const { addNotification } = useNotificationStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<UICategory | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<UICategory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Transform CategoryDocument to UICategory for display
  const transformToUICategory = (doc: CategoryDocument): UICategory => {
    return {
      id: doc.$id,
      title: doc.title || '',
      isAdult: doc.isAdult ?? false,
      createdAt: doc.$createdAt ? new Date(doc.$createdAt).toLocaleDateString() : undefined,
    }
  }

  const [categories, setCategories] = useState<UICategory[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalCategories, setTotalCategories] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Fetch categories from Appwrite with pagination
  const fetchCategories = async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Build pagination queries
      const paginationQueries = [
        Query.limit(pageSize),
        Query.offset((page - 1) * pageSize),
        Query.orderDesc('$createdAt'), // Most recent categories first
      ]
      
      let result
      if (searchTerm.trim()) {
        result = await categoriesService.search(searchTerm.trim(), paginationQueries)
      } else {
        result = await categoriesService.list(paginationQueries)
      }
      
      // Extract pagination metadata
      const total = result.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalCategories(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        if (page !== lastValidPage) {
          return fetchCategories(lastValidPage)
        }
      } else if (totalPagesCount === 0) {
        setCurrentPage(1)
      }
      
      const transformedCategories = result.documents.map(transformToUICategory)
      setCategories(transformedCategories)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories. Please try again.')
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load categories. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchCategories(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
    fetchCategories(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Calculate summary statistics
  // Note: For summary stats, we use the totalCategories state (total from DB)
  // not the length of the current page's categories array
  const newThisMonth = categories.filter((category) => {
    if (!category.createdAt) return false
    const createdDate = new Date(category.createdAt)
    const now = new Date()
    return (
      createdDate.getMonth() === now.getMonth() &&
      createdDate.getFullYear() === now.getFullYear()
    )
  }).length

  const summaryCards = [
    {
      label: 'Total Categories',
      value: totalCategories.toString(), // Use state variable for total count
      icon: 'mdi:tag-multiple',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'New This Month',
      value: newThisMonth.toString(),
      icon: 'mdi:chart-line',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ]

  const handleEditClick = (category: UICategory) => {
    setSelectedCategory(category)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (category: UICategory) => {
    setCategoryToDelete(category)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (categoryToDelete?.id) {
      try {
        await categoriesService.delete(categoryToDelete.id)
        // Check if we need to go back a page if current page becomes empty
        if (categories.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
          await fetchCategories(currentPage - 1)
        } else {
          await fetchCategories(currentPage) // Refresh list
        }
        setCategoryToDelete(null)
        addNotification({
          type: 'success',
          title: 'Category Deleted',
          message: 'The category has been successfully deleted.',
        })
      } catch (err) {
        console.error('Error deleting category:', err)
        const errorMessage = extractErrorMessage(err)
        addNotification({
          type: 'error',
          title: 'Failed to Delete Category',
          message: errorMessage,
        })
      }
    }
  }

  const handleCreateCategory = async (categoryData: { title: string; isAdult?: boolean }) => {
    try {
      await categoriesService.create(categoryData)
      setCurrentPage(1)
      await fetchCategories(1) // Refresh list - reset to page 1 after creating
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Category Created',
        message: 'The category has been successfully created.',
      })
      
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error creating category:', err)
      
      // Extract error message from Appwrite error
      const errorMessage = extractErrorMessage(err)
      
      // Show error notification with actual error message
      addNotification({
        type: 'error',
        title: 'Failed to Create Category',
        message: errorMessage,
      })
      
      // Re-throw error so modal can handle it (keep modal open)
      throw err
    }
  }

  const handleUpdateCategory = async (categoryData: { title: string; isAdult?: boolean }) => {
    if (!selectedCategory?.id) return

    try {
      await categoriesService.update(selectedCategory.id, categoryData)
      await fetchCategories(currentPage) // Refresh list - keep current page
      setIsEditModalOpen(false)
      setSelectedCategory(null)
      addNotification({
        type: 'success',
        title: 'Category Updated',
        message: 'The category has been successfully updated.',
      })
    } catch (err) {
      console.error('Error updating category:', err)
      const errorMessage = extractErrorMessage(err)
      addNotification({
        type: 'error',
        title: 'Failed to Update Category',
        message: errorMessage,
      })
      throw err
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
        <CategoriesHeader onAddCategory={() => setIsModalOpen(true)} />
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
          onSearchChange={setSearchTerm}
        />
        <CategoriesTable
          categories={categories}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCategories={totalCategories}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateCategory}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedCategory(null)
        }}
        onSave={handleUpdateCategory}
        initialData={
          selectedCategory
            ? {
                title: selectedCategory.title,
                isAdult: selectedCategory.isAdult ?? false,
              }
            : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        type="delete"
        itemName={categoryToDelete ? `category "${categoryToDelete.title}"` : 'category'}
      />
    </DashboardLayout>
  )
}

export default Categories

