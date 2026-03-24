import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { clientsService, triviaService, type ClientDocument } from '../../../lib/services'
import { appTimeToUTC, utcToAppTimeFormInputs } from '../../../lib/dateUtils'
import { useTimezoneStore } from '../../../stores/timezoneStore'
import { trimFormStrings } from '../../../lib/formUtils'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import { UnsavedChangesModal } from '../../../components'

interface EditTriviaModalProps {
  isOpen: boolean
  onClose: () => void
  triviaId: string
  onUpdate: () => Promise<void>
}

const EditTriviaModal = ({ isOpen, onClose, triviaId, onUpdate }: EditTriviaModalProps) => {
  const { appTimezone } = useTimezoneStore()
  const [formData, setFormData] = useState({
    client: '', // Client ID
    question: '',
    answers: ['', '', '', ''], // Array of answer strings
    correctOptionIndex: 0, // Index of correct answer
    points: 10, // Default points
  })
  const [brands, setBrands] = useState<ClientDocument[]>([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(false)
  const [isLoadingTrivia, setIsLoadingTrivia] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const initialDataRef = useRef(formData)

  const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)

  // Fetch trivia data and brands when modal opens
  useEffect(() => {
    if (isOpen && triviaId) {
      fetchTrivia()
      fetchBrands()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, triviaId])

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

  const fetchTrivia = async () => {
    try {
      setIsLoadingTrivia(true)
      setError(null)
      const { trivia } = await triviaService.getWithClient(triviaId)
      
      // Ensure answers array has at least 4 elements
      const answers = trivia.answers && trivia.answers.length > 0 
        ? [...trivia.answers, ...Array(Math.max(0, 4 - trivia.answers.length)).fill('')].slice(0, 4)
        : ['', '', '', '']
      
      const initialFormData = {
        client: trivia.client || '',
        question: trivia.question || '',
        answers,
        correctOptionIndex: trivia.correctOptionIndex ?? 0,
        points: trivia.points ?? 10,
      }
      setFormData(initialFormData)
      initialDataRef.current = initialFormData
    } catch (err) {
      console.error('Error fetching trivia:', err)
      setError('Failed to load trivia quiz. Please try again.')
    } finally {
      setIsLoadingTrivia(false)
    }
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        client: '',
        question: '',
        answers: ['', '', '', ''],
        correctOptionIndex: 0,
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

  const getNextTuesdayWindowUTC = (timezone: string): { startDate: string; endDate: string } => {
    const now = new Date()
    const { dateStr } = utcToAppTimeFormInputs(now.toISOString(), timezone)
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(now)
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    const currentWeekday = weekdayMap[weekday] ?? 0
    const rawDaysUntilTuesday = (2 - currentWeekday + 7) % 7
    const daysUntilTuesday = rawDaysUntilTuesday === 0 ? 7 : rawDaysUntilTuesday

    const [y, m, d] = dateStr.split('-').map(Number)
    const tuesdayDate = new Date(Date.UTC(y, m - 1, d + daysUntilTuesday, 0, 0, 0, 0))
    const tuesdayDateStr = `${tuesdayDate.getUTCFullYear()}-${String(tuesdayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tuesdayDate.getUTCDate()).padStart(2, '0')}`

    const startUtc = appTimeToUTC(tuesdayDateStr, '00:00', timezone)
    const endUtc = appTimeToUTC(tuesdayDateStr, '23:59', timezone)

    return {
      startDate: startUtc.toISOString(),
      endDate: endUtc.toISOString(),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmed = trimFormStrings(formData)

    if (!trimmed.question) {
      alert('Please enter a question.')
      return
    }

    // Validate that all answers have text
    const allAnswersFilled = trimmed.answers.every((answer) => answer !== '')
    if (!allAnswersFilled) {
      alert('Please fill in all answer options')
      return
    }

    // Validate correct option index is valid
    if (trimmed.correctOptionIndex < 0 || trimmed.correctOptionIndex >= trimmed.answers.length) {
      alert('Please select a valid correct answer')
      return
    }

    // Validate points
    if (trimmed.points < 0 || trimmed.points > 1000) {
      alert('Points must be between 0 and 1000')
      return
    }

    try {
      setError(null)
      setIsSubmitting(true)
      // Convert app-timezone form values to UTC ISO for storage
      const triviaData = {
        client: trimmed.client || undefined,
        question: trimmed.question,
        answers: trimmed.answers,
        correctOptionIndex: trimmed.correctOptionIndex,
        ...getNextTuesdayWindowUTC(appTimezone),
        points: trimmed.points,
      }
      await triviaService.update(triviaId, triviaData)
      await onUpdate() // Refresh the list
      setShowUnsavedChangesModal(false)
      onClose()
    } catch (err) {
      console.error('Error updating trivia:', err)
      setError('Failed to update trivia quiz. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges && !isSubmitting) {
      setShowUnsavedChangesModal(true)
    } else {
      setError(null)
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setShowUnsavedChangesModal(false)
    setError(null)
    onClose()
  }

  if (isLoadingTrivia) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-8 m-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D0A74]"></div>
            <span className="ml-3 text-gray-700">Loading trivia quiz...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onDiscard={handleDiscardChanges}
        onCancel={() => setShowUnsavedChangesModal(false)}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Trivia Quiz</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update trivia quiz details.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} data-trivia-form className="p-6">
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

          {/* Points Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points Awarded <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Trivia availability is automatically set to Tuesday only (12:00 AM - 11:59 PM in user timezone).
            </p>
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
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Trivia'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default EditTriviaModal

