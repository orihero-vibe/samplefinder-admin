import { useState } from 'react'
import { Icon } from '@iconify/react'

interface CreateTriviaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (triviaData: {
    brandName: string
    question: string
    answers: { option: string; isCorrect: boolean }[]
    scheduledDateTime: string
  }) => void
}

const CreateTriviaModal = ({ isOpen, onClose, onSave }: CreateTriviaModalProps) => {
  const [formData, setFormData] = useState({
    brandName: '',
    question: '',
    answers: [
      { option: '', isCorrect: false },
      { option: '', isCorrect: true },
      { option: '', isCorrect: false },
      { option: '', isCorrect: false },
    ],
    scheduledDateTime: '',
  })

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...formData.answers]
    newAnswers[index].option = value
    setFormData((prev) => ({ ...prev, answers: newAnswers }))
  }

  const handleCorrectAnswerChange = (index: number) => {
    const newAnswers = formData.answers.map((answer, i) => ({
      ...answer,
      isCorrect: i === index,
    }))
    setFormData((prev) => ({ ...prev, answers: newAnswers }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that at least one answer is marked as correct
    const hasCorrectAnswer = formData.answers.some((answer) => answer.isCorrect)
    if (!hasCorrectAnswer) {
      alert('Please mark at least one answer as correct')
      return
    }

    // Validate that all answers have text
    const allAnswersFilled = formData.answers.every((answer) => answer.option.trim() !== '')
    if (!allAnswersFilled) {
      alert('Please fill in all answer options')
      return
    }

    onSave(formData)
    
    // Reset form
    setFormData({
      brandName: '',
      question: '',
      answers: [
        { option: '', isCorrect: false },
        { option: '', isCorrect: true },
        { option: '', isCorrect: false },
        { option: '', isCorrect: false },
      ],
      scheduledDateTime: '',
    })
    onClose()
  }

  const handleClose = () => {
    // Reset form on close
    setFormData({
      brandName: '',
      question: '',
      answers: [
        { option: '', isCorrect: false },
        { option: '', isCorrect: true },
        { option: '', isCorrect: false },
        { option: '', isCorrect: false },
      ],
      scheduledDateTime: '',
    })
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
          {/* Brand Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.brandName}
                onChange={(e) => handleInputChange('brandName', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Choose Brand name</option>
                <option value="Glossier">Glossier</option>
                <option value="Chanel">Chanel</option>
                <option value="The Ordinary">The Ordinary</option>
                <option value="Fenty Beauty">Fenty Beauty</option>
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
              placeholder="Enter Notification Message."
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
              Answers
            </label>
            <div className="space-y-4">
              {formData.answers.map((answer, index) => {
                const optionLabel = String.fromCharCode(65 + index) // A, B, C, D
                return (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={answer.isCorrect}
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
                      value={answer.option}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      required
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Schedule Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When to send?
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={formData.scheduledDateTime}
                onChange={(e) => handleInputChange('scheduledDateTime', e.target.value)}
                placeholder="Schedule"
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
              <Icon
                icon="mdi:calendar"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              />
            </div>
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

