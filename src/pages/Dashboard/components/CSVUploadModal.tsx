import { useState } from 'react'
import { Icon } from '@iconify/react'

interface CSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File) => Promise<void>
}

const CSVUploadModal = ({ isOpen, onClose, onUpload }: CSVUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen) return null

  // Required columns in alphabetical order: non-location fields first, then location fields
  const requiredColumns = [
    // Non-location fields (alphabetical)
    'Brand Name',
    'Category',
    'Check-in Code',
    'Date',
    'End Time',
    'Event Info',
    'Event Name',
    'Points',
    'Products',
    'Review Points',
    'Start Time',
    // Location fields (alphabetical)
    'Address',
    'City',
    'Latitude',
    'Longitude',
    'State',
    'Zip Code',
  ]
  
  // Optional columns (alphabetical)
  const optionalColumns = [
    'Brand Description',
    'Discount',
    'Discount Image URL',
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv' || file?.name.endsWith('.csv')) {
      setSelectedFile(file)
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setSelectedFile(file)
    } else {
      alert('Please drop a valid CSV file')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file to upload')
      return
    }

    setIsUploading(true)
    try {
      await onUpload(selectedFile)
      setSelectedFile(null)
      onClose()
    } catch {
      // Error is handled by parent component via notification
      // Keep modal open so user can retry
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    // Create CSV template with headers and sample data (required + optional columns)
    const allColumns = [...requiredColumns, ...optionalColumns]
    const headers = allColumns.join(',')
    const sampleValues = [
      // Required columns (in alphabetical order: non-location first, then location)
      '[REPLACE WITH EXISTING BRAND]',    // Brand Name - Must exist in your database
      '[REPLACE WITH EXISTING CATEGORY]', // Category - Must exist in your database
      'CHK001',                           // Check-in Code
      '2026-01-25',                       // Date (YYYY-MM-DD format)
      '17:00',                            // End Time (HH:MM)
      'Event description goes here',      // Event Info
      'My Event Name',                    // Event Name - Replace with your event name
      '100',                              // Points (Check In Points)
      'Beer, Wine',                       // Products (comma-separated)
      '50',                               // Review Points
      '09:00',                            // Start Time (HH:MM)
      // Location fields (alphabetical)
      '123 Main Street',                  // Address
      'New York',                         // City
      '40.7128',                          // Latitude
      '-74.0060',                         // Longitude
      'NY',                               // State
      '10001',                            // Zip Code
      // Optional columns (alphabetical)
      'Premium craft beer brand',         // Brand Description (optional)
      '10%',                              // Discount (optional, text field)
      'https://example.com/image.jpg',    // Discount Image URL (optional)
    ]
    // Properly escape CSV values (wrap in quotes if contains comma, quote, or newline)
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }
    const sampleRow = sampleValues.map(escapeCSV).join(',')
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${sampleRow}`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'events_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isUploading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">CSV Upload Events</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV file to bulk import events. Make sure your file includes all required columns.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* File Upload Area */}
          <div className="mb-6">
            <label
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#1D0A74] bg-[#1D0A74]/5'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Icon icon="mdi:cloud-upload" className="w-12 h-12 text-gray-400 mb-3" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Your CSV file here</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {selectedFile && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Icon icon="mdi:file-document" className="w-5 h-5 text-green-600" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-gray-400">
                  ({(selectedFile.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Required Columns Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Required columns</h3>
            <div className="flex flex-wrap gap-2">
              {requiredColumns.map((column, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-medium"
                >
                  {column}
                </span>
              ))}
            </div>
          </div>

          {/* Optional Columns Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Optional columns</h3>
            <div className="flex flex-wrap gap-2">
              {optionalColumns.map((column, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 font-medium"
                >
                  {column}
                </span>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-blue-800 font-semibold">Important Instructions:</p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>The first row must be the header row with exact column names</li>
              <li><strong>Brand Name</strong> and <strong>Category</strong> must match existing values in the database</li>
              <li><strong>Date</strong> format: YYYY-MM-DD (e.g., 2026-01-25)</li>
              <li><strong>Time</strong> format: HH:MM (e.g., 09:00, 17:00)</li>
              <li><strong>Latitude/Longitude</strong>: Decimal coordinates (e.g., 40.7128, -74.0060)</li>
              <li>Download the template and replace sample values with your actual data</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-6 py-3 bg-[#1D0A74]/10 text-[#1D0A74] rounded-lg hover:bg-[#1D0A74]/20 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading}
          >
            Download Template
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Events'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CSVUploadModal

