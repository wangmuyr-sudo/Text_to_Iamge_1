'use client'

import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [images, setImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState('300')
  const [quality, setQuality] = useState(90)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePosition = useRef({ x: 0, y: 0 })

  const [rotate, setRotate] = useState(0)
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)

  const MAX_FILES = 5
  const MAX_SIZE = 20 * 1024 * 1024

  const resetViewer = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsPanning(false)
  }

  const resetEdit = () => {
    setRotate(0)
    setFlipHorizontal(false)
    setFlipVertical(false)
  }

  const updateFiles = (selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length > MAX_FILES) {
      alert(`最多上传 ${MAX_FILES} 张图片`)
      return
    }
    const tooBig = imageFiles.find(f => f.size > MAX_SIZE)
    if (tooBig) {
      alert('单张图片不能超过 20MB')
      return
    }
    if (imageFiles.length === 0) {
      alert('请上传有效的图片文件')
      return
    }

    images.forEach(url => URL.revokeObjectURL(url))
    setFiles(imageFiles)
    setImages(imageFiles.map(file => URL.createObjectURL(file)))
    setSelectedIndex(0)
    resetViewer()
    resetEdit()
  }

  const handleDelete = (index: number) => {
    const newImages = [...images]
    const newFiles = [...files]
    URL.revokeObjectURL(newImages[index])
    newImages.splice(index, 1)
    newFiles.splice(index, 1)
    setImages(newImages)
    setFiles(newFiles)

    if (newImages.length === 0) {
      setSelectedIndex(0)
      resetEdit()
    } else if (selectedIndex === index) {
      setSelectedIndex(Math.max(0, index - 1))
    } else if (selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1)
    }
    resetViewer()
  }

  const handleClearAll = () => {
    if (files.length === 0) return
    if (!confirm('确定要清空所有图片吗？')) return
    images.forEach(url => URL.revokeObjectURL(url))
    setImages([])
    setFiles([])
    setSelectedIndex(0)
    resetViewer()
    resetEdit()
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    updateFiles(selectedFiles)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files || [])
    updateFiles(droppedFiles)
  }

  const handleSelectImage = (index: number) => {
    setSelectedIndex(index)
    resetViewer()
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!images[selectedIndex]) return
    e.preventDefault()
    setScale(prev => {
      const next = e.deltaY < 0 ? prev + 0.1 : prev - 0.1
      return Math.min(Math.max(next, 0.1), 8)
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!images[selectedIndex]) return
    e.preventDefault()
    setIsPanning(true)
    lastMousePosition.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return
    e.preventDefault()
    const dx = e.clientX - lastMousePosition.current.x
    const dy = e.clientY - lastMousePosition.current.y
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    lastMousePosition.current = { x: e.clientX, y: e.clientY }
  }

  const stopPanning = () => setIsPanning(false)

  useEffect(() => {
    const up = () => setIsPanning(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  useEffect(() => {
    return () => images.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  const handleRotate = () => {
    setRotate(prev => (prev + 90) % 360)
  }

  const handleFlipHorizontal = () => {
    setFlipHorizontal(prev => !prev)
  }

  const handleFlipVertical = () => {
    setFlipVertical(prev => !prev)
  }

  const handleConvert = async () => {
    if (files.length === 0) {
      alert('请先上传图片')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('type', format)
      formData.append('dpi', dpi)
      formData.append('quality', String(quality))
      formData.append('rotate', String(rotate))
      formData.append('flipHorizontal', String(flipHorizontal))
      formData.append('flipVertical', String(flipVertical))

      const res = await fetch('/api/convert', { method: 'POST', body: formData })

      if (!res.ok) {
        let msg = '转换失败'
        try {
          const data = await res.json()
          msg = data.error || msg
        } catch {}
        alert(msg)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'converted_files.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('转换出错，请重试')
    } finally {
      setLoading(false)
    }
  }

  const selectedImage = images[selectedIndex]
  const selectedFile = files[selectedIndex]
  const hasImage = !!selectedImage

  return (
    <div className="h-screen flex flex-col bg-[#f7f8fa] text-[#1d1d1f]">
      <div className="h-14 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center px-6 shadow-md text-white">
        <div className="font-bold text-lg tracking-wide">🖼️ 智能图片转换工具</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-5 shadow-sm">
          <label className="text-sm cursor-pointer text-center hover:text-blue-600 transition">
            上传
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          <button onClick={handleRotate} disabled={!hasImage} className="text-sm disabled:text-gray-300 hover:text-blue-600 transition">旋转</button>
          <button onClick={handleFlipHorizontal} disabled={!hasImage} className="text-sm disabled:text-gray-300 hover:text-blue-600 transition">水平翻转</button>
          <button onClick={handleFlipVertical} disabled={!hasImage} className="text-sm disabled:text-gray-300 hover:text-blue-600 transition">垂直翻转</button>

          {files.length > 0 && (
            <button onClick={handleClearAll} className="text-sm text-red-500 hover:text-red-600 transition">清空</button>
          )}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            dragging ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-gray-50'
          }`}
        >
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPanning}
            onMouseLeave={stopPanning}
            onDoubleClick={resetViewer}
            className={`relative flex-1 overflow-hidden bg-white select-none transition ${
              hasImage ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            {hasImage ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt="预览"
                    draggable={false}
                    className="bg-white rounded-lg shadow-lg object-contain"
                    style={{
                      maxWidth: '90%',
                      maxHeight: '90%',
                      transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotate}deg) scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`,
                      transformOrigin: 'center center',
                    }}
                  />
                </div>

                <div className="absolute right-4 top-4 bg-black/75 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  {Math.round(scale * 100)}%
                </div>

                <div className="absolute left-4 bottom-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg pointer-events-none">
                  滚轮缩放 · 拖动查看 · 双击重置
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-lg mb-2">📁 拖拽图片到这里上传</div>
                <div className="text-sm">最多 5 张 · 单张 ≤ 20MB</div>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="h-28 bg-white border-t border-gray-200 px-4 py-3 overflow-x-auto">
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <button
                      onClick={() => handleSelectImage(i)}
                      className={`w-20 h-20 rounded-lg border overflow-hidden transition-all ${
                        selectedIndex === i
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>

                    <button
                      onClick={() => handleDelete(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto shadow-sm">
          <h2 className="font-bold text-xl mb-5 text-[#1d1d1f]">⚙️ 转换设置</h2>

          <label className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3 rounded-xl cursor-pointer font-medium shadow hover:shadow-md transition">
            📤 选择图片
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          {files.length > 0 && (
            <div className="mt-4 text-sm text-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">已选 {files.length}/{MAX_FILES}</span>
                <button onClick={handleClearAll} className="text-red-500 text-sm">清空全部</button>
              </div>

              <div className="max-h-32 overflow-y-auto pr-1 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <button
                      onClick={() => handleSelectImage(i)}
                      className={`text-left truncate ${selectedIndex === i ? 'text-blue-600 font-medium' : ''}`}
                    >
                      {f.name}
                    </button>
                    <button onClick={() => handleDelete(i)} className="text-red-500 text-xs">删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <label className="block mb-1.5 text-sm font-medium">转换格式</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
              <option value="tiff">TIFF</option>
              <option value="cmyk">CMYK JPG</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block mb-1.5 text-sm font-medium">DPI 清晰度</label>
            <select
              value={dpi}
              onChange={(e) => setDpi(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              <option value="72">72 (屏幕)</option>
              <option value="150">150 (中等)</option>
              <option value="300">300 (高清打印)</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block mb-1.5 text-sm font-medium">图片质量：{quality}</label>
            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={handleRotate}
              disabled={!hasImage}
              className="flex-1 border border-gray-300 rounded-xl p-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              旋转
            </button>
            <button
              onClick={handleFlipHorizontal}
              disabled={!hasImage}
              className="flex-1 border border-gray-300 rounded-xl p-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              水平
            </button>
            <button
              onClick={handleFlipVertical}
              disabled={!hasImage}
              className="flex-1 border border-gray-300 rounded-xl p-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              垂直
            </button>
          </div>

          <button
            onClick={handleConvert}
            disabled={loading || !hasImage}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-medium shadow hover:shadow-lg transition disabled:bg-gray-300 disabled:shadow-none"
          >
            {loading ? '⏳ 处理中...' : '🚀 开始转换并下载'}
          </button>
        </div>
      </div>
    </div>
  )
}