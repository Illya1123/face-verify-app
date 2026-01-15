'use client'

import { useCameraPreview } from '@/hooks/useCameraPreview'

interface CapacitorCameraPreviewProps {
  onCapture: (base64Image: string) => void
  onClose: () => void
}

const CapacitorCameraPreview = ({
  onCapture,
  onClose,
}: CapacitorCameraPreviewProps) => {
  const {
    isActive,
    isCapturing,
    isCheckingPermission,
    permissionGranted,
    permissionDenied,
    currentCamera,
    availableCameras,
    isWebCamera,
    cameraDevices,
    currentDeviceId,
    videoRef,
    faceDetected,
    countdown,
    handleCapture,
    handleFlipCamera,
    handleSwitchCamera,
    handleSwitchWebCamera,
    handleRetryPermission,
    handleClose,
  } = useCameraPreview({ onCapture, onClose })

  const hasMultipleCameras = isWebCamera
    ? cameraDevices.length > 1
    : availableCameras.length > 1

  return (
    <div className="fixed inset-0 z-50">
      {/* Camera UI - Always render on top */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 pointer-events-auto pt-safe">
          <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>

            <div className="flex items-center gap-2">
              {/* {hasMultipleCameras && (
                <div className="relative">
                  <select
                    value={isWebCamera ? currentDeviceId : currentCamera}
                    onChange={(e) => {
                      if (isWebCamera) {
                        handleSwitchWebCamera(e.target.value)
                      } else {
                        handleSwitchCamera(e.target.value as 'front' | 'rear')
                      }
                    }}
                    className="appearance-none bg-black/50 text-white text-sm rounded-lg px-3 py-2 pr-8 hover:bg-black/70 transition-colors cursor-pointer"
                  >
                    {isWebCamera ? (
                      cameraDevices.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId} className="bg-gray-900">
                          {camera.label}
                        </option>
                      ))
                    ) : (
                      availableCameras.map((camera) => (
                        <option key={camera} value={camera} className="bg-gray-900">
                          {camera === 'front' ? 'Front Camera' : 'Rear Camera'}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )} */}

              {hasMultipleCameras && !isWebCamera && (
                <button
                  onClick={handleFlipCamera}
                  className="w-10 h-10 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  title="Switch camera"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {permissionGranted && isActive && (
          <>
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative z-10">
                  <div className="relative" style={{
                    width: 'min(80vw, 60vh)',
                    aspectRatio: '3/4'
                  }}>
                    {/* Corners with dynamic color based on face detection */}
                    <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg transition-colors ${
                      faceDetected ? 'border-green-500' : 'border-white'
                    }`}></div>
                    <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg transition-colors ${
                      faceDetected ? 'border-green-500' : 'border-white'
                    }`}></div>
                    <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg transition-colors ${
                      faceDetected ? 'border-green-500' : 'border-white'
                    }`}></div>
                    <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-lg transition-colors ${
                      faceDetected ? 'border-green-500' : 'border-white'
                    }`}></div>

                    {/* Countdown display - always visible when countdown is active */}
                    {countdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="bg-green-500 text-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-2xl border-4 border-white">
                          <span className="text-6xl font-bold animate-pulse">{countdown}</span>
                          {countdown === 0 && (
                            <span className="text-sm mt-1">Chụp!</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Debug info - show detection status */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-30 space-y-1">
                      <div>{isWebCamera ? '🌐 Web' : '📱 Native'} • {faceDetected ? '✅ Phát hiện mặt' : '❌ Không có mặt'}</div>
                      <div>Countdown: {countdown !== null ? `${countdown}s` : 'null'}</div>
                      <div>isCapturing: {isCapturing ? 'true' : 'false'}</div>
                    </div>
                  </div>

                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
                    <p className={`text-sm font-medium drop-shadow-lg px-4 py-2 rounded-lg transition-colors ${
                      faceDetected
                        ? 'text-green-400 bg-green-900/80'
                        : 'text-white bg-black/60'
                    }`}>
                      {countdown !== null && countdown > 0
                        ? `Đang chụp trong ${countdown} giây...`
                        : faceDetected
                          ? '✓ Khuôn mặt đã được phát hiện'
                          : 'Đưa gương mặt vào trong khung'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom capture area */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto pb-safe">
              <div className="flex justify-center items-center p-8 bg-gradient-to-t from-black/80 to-transparent">
                <button
                  onClick={handleCapture}
                  disabled={isCapturing || countdown !== null}
                  className={`relative w-20 h-20 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${isCapturing || countdown !== null ? 'pointer-events-none' : ''}`}
                  title="Chụp ảnh"
                >
                  {isCapturing ? (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {!isWebCamera && (
        <div
          id="capacitor-camera-preview"
          className="absolute inset-0 w-full h-full z-0"
        />
      )}

      {isWebCamera && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {isCheckingPermission && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-white bg-black">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Đang kiểm tra quyền camera...</p>
          </div>
        </div>
      )}

      {permissionDenied && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white px-6 bg-black">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Không thể truy cập camera</h3>
            <p className="text-gray-300 mb-6">
              Ứng dụng cần quyền truy cập camera để chụp ảnh. Vui lòng cấp quyền trong cài đặt thiết bị.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRetryPermission}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CapacitorCameraPreview
