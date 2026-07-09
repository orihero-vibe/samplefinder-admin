interface PreviewPopupModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  link: string
  imageUrl: string | null
}

const PreviewPopupModal = ({ isOpen, onClose, title, description, link, imageUrl }: PreviewPopupModalProps) => {
  if (!isOpen) return null
  const t = title.trim()
  const d = description.trim()
  const hasLink = !!link.trim()
  const hasPanel = !!t || !!d || hasLink

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-medium uppercase tracking-wide text-white/70">
          Preview · how it appears in the app
        </span>
        <div className="relative w-[300px] rounded-[20px] bg-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1D0A74] bg-white text-[#1D0A74] shadow"
          >
            ✕
          </button>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={t || 'Pop-up banner'}
              className={`w-full ${hasPanel ? 'rounded-t-[20px]' : 'rounded-[20px]'} object-contain`}
              style={{ maxHeight: 340 }}
            />
          ) : (
            <div className={`flex h-40 w-full items-center justify-center bg-gray-100 text-sm text-gray-400 ${hasPanel ? 'rounded-t-[20px]' : 'rounded-[20px]'}`}>
              Select a banner image
            </div>
          )}
          {hasPanel && (
            <div className="flex flex-col gap-2.5 px-[18px] pb-[18px] pt-3.5">
              {!!t && <p className="m-0 text-[17px] font-bold text-[#1D0A74]">{t}</p>}
              {!!d && <p className="m-0 max-h-40 overflow-y-auto text-[13px] leading-snug text-[#5b5670]">{d}</p>}
              {hasLink && (
                <span className="block rounded-xl bg-gradient-to-br from-[#3D1578] via-[#1D0A74] to-[#6C0331] py-3 text-center text-sm font-bold text-white">
                  Learn More
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PreviewPopupModal
