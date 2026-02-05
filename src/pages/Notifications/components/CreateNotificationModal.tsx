import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import type { NotificationFormData } from '../../../lib/services'

interface CreateNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (notificationData: NotificationFormData) => void
  initialData?: NotificationFormData | null
  isEditMode?: boolean
}

const defaultFormData: NotificationFormData = {
  title: '',
  message: '',
  type: 'Event Reminder',
  targetAudience: 'All',
  schedule: 'Send Immediately',
  scheduledAt: '',
  scheduledTime: '',
}

const CreateNotificationModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditMode = false,
}: CreateNotificationModalProps) => {
  const [formData, setFormData] = useState<NotificationFormData>(defaultFormData)

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      setFormData(defaultFormData)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate scheduled date/time if scheduling for later
    if (formData.schedule === 'Schedule for Later') {
      if (!formData.scheduledAt || !formData.scheduledTime) {
        alert('Please select both date and time for scheduled notifications')
        return
      }
      
      // Validate that scheduled time is in the future
      const scheduledDate = new Date(`${formData.scheduledAt}T${formData.scheduledTime}`)
      if (scheduledDate <= new Date()) {
        alert('Scheduled date and time must be in the future')
        return
      }
    }
    
    onSave(formData)
    // Reset form
    setFormData(defaultFormData)
    onClose()
  }

  const handleClose = () => {
    // Reset form on close
    setFormData(defaultFormData)
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
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Notification' : 'Create Notification'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isEditMode 
                ? 'Update the notification details below.'
                : 'Send targeted push notifications to your app users.'}
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
          {/* Section 1: Content */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1D0A74] text-white flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Content</h3>
            </div>
            <div className="ml-11 space-y-4">
              {/* Notification Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Enter Notification Message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent resize-none"
                />
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Type
                </label>
                <div className="relative">
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value as 'Event Reminder' | 'Promotional' | 'Engagement')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10"
                  >
                    <option value="Event Reminder">Event Reminder</option>
                    <option value="Promotional">Promotional</option>
                    <option value="Engagement">Engagement</option>
                  </select>
                  <Icon
                    icon="mdi:chevron-down"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Audience */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1D0A74] text-white flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Audience</h3>
            </div>
            <div className="ml-11">
              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <div className="relative">
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value as 'All' | 'Targeted' | 'Specific Segment')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10"
                  >
                    <option value="All">All Users</option>
                    <option value="Targeted">Targeted Users</option>
                    <option value="Specific Segment">Specific Segment</option>
                  </select>
                  <Icon
                    icon="mdi:chevron-down"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Schedule */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1D0A74] text-white flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
            </div>
            <div className="ml-11 space-y-4">
              {/* When to send */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When to send?
                </label>
                <div className="relative">
                  <select
                    value={formData.schedule}
                    onChange={(e) => handleInputChange('schedule', e.target.value as 'Send Immediately' | 'Schedule for Later' | 'Recurring')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10"
                  >
                    <option value="Send Immediately">Send Immediately</option>
                    <option value="Schedule for Later">Schedule for Later</option>
                    <option value="Recurring">Recurring</option>
                  </select>
                  <Icon
                    icon="mdi:chevron-down"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Date and Time pickers for scheduled notifications */}
              {formData.schedule === 'Schedule for Later' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledAt}
                      onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                      required={formData.schedule === 'Schedule for Later'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Time
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                      required={formData.schedule === 'Schedule for Later'}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold"
            >
              {isEditMode ? 'Update Notification' : 'Create Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateNotificationModal

