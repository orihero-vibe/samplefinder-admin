import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { clientsService } from '../../../lib/services'
import type { ClientDocument } from '../../../lib/services'
import { formatDateWithTimezone } from '../../../lib/dateUtils'

interface CreateTriviaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (triviaData: {
    client: string // Client ID from relationship
    question: string
    answers: string[] // Array of answer strings
    correctOptionIndex: number // Index of correct answer
    startDate: string // ISO 8601 datetime string
    endDate: string // ISO 8601 datetime string
    points: number // Points for correct answer
  }) => Promise<void>
}

const CreateTriviaModal = ({ isOpen, onClose, onSave }: CreateTriviaModalProps) => {
  const [formData, setFormData] = useState({
    client: '', // Client ID
    question: '',
    answers: ['', '', '', ''], // Array of answer strings
    correctOptionIndex: 1, // Index of correct answer (default to second option, index 1)
    startDate: '', // Start date/time
    endDate: '', // End date/time
    points: 10, // Default points
  })
  const [brands, setBrands] = useState<ClientDocument[]>([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch brands when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBrands()
    }
  }, [isOpen])

  const fetchBrands = async () => {
    try {
      setIsLoadingBrands(true)
      setError(null)
      const result = await clientsService.list()
      setBrands(result.documents)
    } catch (err) {
      console.error('Error fetching brands:', err)
      setError('Failed to load brands. Please try again.')
    } finally {
      setIsLoadingBrands(false)
    }
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        client: '',
        question: '',
        answers: ['', '', '', ''],
        correctOptionIndex: 1,
        startDate: '',
        endDate: '',
        points: 10,
      })
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...formData.answers]
    newAnswers[index] = value
    setFormData((prev) => ({ ...prev, answers: newAnswers }))
  }

  const handleCorrectAnswerChange = (index: number) => {
    setFormData((prev) => ({ ...prev, correctOptionIndex: index }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that all answers have text
    const allAnswersFilled = formData.answers.every((answer) => answer.trim() !== '')
    if (!allAnswersFilled) {
      alert('Please fill in all answer options')
      return
    }

    // Validate correct option index is valid
    if (formData.correctOptionIndex < 0 || formData.correctOptionIndex >= formData.answers.length) {
      alert('Please select a valid correct answer')
      return
    }

    // Validate dates
    if (!formData.startDate || !formData.endDate) {
      alert('Please provide both start date and end date')
      return
    }

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)

    if (endDate <= startDate) {
      alert('End date must be after start date')
      return
    }

    // Validate points
    if (formData.points < 0 || formData.points > 1000) {
      alert('Points must be between 0 and 1000')
      return
    }

    try {
      setError(null)
      // Convert dates to ISO 8601 format with timezone preservation
      const triviaData = {
        client: formData.client,
        question: formData.question,
        answers: formData.answers,
        correctOptionIndex: formData.correctOptionIndex,
        startDate: formatDateWithTimezone(startDate),
        endDate: formatDateWithTimezone(endDate),
        points: formData.points,
      }
      await onSave(triviaData)
      // onSave is async, parent will handle closing modal on success
      // The useEffect will reset form when modal closes
    } catch (err) {
      console.error('Error saving trivia:', err)
      setError('Failed to save trivia quiz. Please try again.')
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Trivia Quiz</h2>
            <p className="text-sm text-gray-600 mt-1">
              New Trivia Quiz for users.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
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

          {/* Client/Brand Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client/Brand <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.client}
                onChange={(e) => handleInputChange('client', e.target.value)}
                required
                disabled={isLoadingBrands}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingBrands ? 'Loading clients...' : 'Choose Client'}
                </option>
                {brands.map((brand) => (
                  <option key={brand.$id} value={brand.$id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <Icon
                icon="mdi:chevron-down"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Trivia Question */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trivia Question <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Enter trivia question..."
              value={formData.question}
              onChange={(e) => handleInputChange('question', e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent resize-none"
            />
          </div>

          {/* Answers Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Answers <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              {formData.answers.map((answer, index) => {
                const optionLabel = String.fromCharCode(65 + index) // A, B, C, D
                return (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correctOptionIndex === index}
                      onChange={() => handleCorrectAnswerChange(index)}
                      className="w-5 h-5 cursor-pointer"
                      style={{ accentColor: '#1D0A74' }}
                    />
                    <label className="text-sm font-medium text-gray-700 min-w-[24px]">
                      Option {optionLabel}:
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter answer option ${optionLabel}...`}
                      value={answer}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      required
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select the radio button next to the correct answer option.
            </p>
          </div>

          {/* Date/Time Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
                <Icon
                  icon="mdi:calendar"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
                <Icon
                  icon="mdi:calendar"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Points Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points Awarded <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={formData.points}
              onChange={(e) => handleInputChange('points', parseInt(e.target.value) || 0)}
              required
              placeholder="Enter points (0-1000)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Points users will earn for answering correctly (0-1000)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold"
            >
              Create Trivia
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTriviaModal

