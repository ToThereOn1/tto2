'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Check, Loader2, Mail, User } from 'lucide-react'

interface Letter {
    id: string
    pet_id: string
    user_id: string
    content: string
    status: string
    created_at: string
    pets: {
        id: string
        name: string
        species: string
        photos?: string[]
        relationship?: string
    }
    originalUserLetter?: {
        id: string
        content: string
        created_at: string
    }
}

export function LetterReviewClient() {
    const [letters, setLetters] = useState<Letter[]>([])
    const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null)
    const [editedContent, setEditedContent] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchLetters()
    }, [])

    const fetchLetters = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/letters')
            const data = await res.json()
            if (res.ok) {
                setLetters(data.letters || [])
                if (data.letters?.length > 0 && !selectedLetter) {
                    setSelectedLetter(data.letters[0])
                    setEditedContent(data.letters[0].content)
                }
            } else {
                setError(data.error)
            }
        } catch {
            setError('Failed to fetch letters')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelectLetter = (letter: Letter) => {
        setSelectedLetter(letter)
        setEditedContent(letter.content)
    }

    const handleRegenerate = async () => {
        if (!selectedLetter) return
        setIsProcessing(true)
        try {
            const res = await fetch(`/api/admin/letters/${selectedLetter.id}`, {
                method: 'POST'
            })
            const data = await res.json()
            if (res.ok) {
                setEditedContent(data.newContent)
            }
        } catch {
            alert('Failed to regenerate')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleApprove = async () => {
        if (!selectedLetter) return
        setIsProcessing(true)
        try {
            const res = await fetch(`/api/admin/letters/${selectedLetter.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', content: editedContent })
            })
            if (res.ok) {
                await fetchLetters()
                setSelectedLetter(null)
            }
        } catch {
            alert('Failed to approve')
        } finally {
            setIsProcessing(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getPetImage = (letter: Letter) => {
        if (letter.pets?.photos && letter.pets.photos.length > 0) {
            return letter.pets.photos[0]
        }
        return '/placeholder-pet.png'
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 text-red-600 bg-red-50 rounded-lg">
                Error: {error}
            </div>
        )
    }

    if (letters.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <Check className="w-16 h-16 mb-4 text-green-500" />
                <h3 className="text-xl font-semibold">모두 확인 완료!</h3>
                <p>검수 대기 중인 편지가 없습니다</p>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Left Panel: Letter List */}
            <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-gray-800">
                        검수 대기 ({letters.length})
                    </h3>
                    <button
                        onClick={fetchLetters}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {letters.map((letter) => (
                        <div
                            key={letter.id}
                            onClick={() => handleSelectLetter(letter)}
                            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 transition-colors ${selectedLetter?.id === letter.id
                                ? 'bg-purple-50 border-l-4 border-l-purple-500'
                                : 'hover:bg-gray-50'
                                }`}
                        >
                            <img
                                src={getPetImage(letter)}
                                alt={letter.pets?.name}
                                className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-200"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm truncate">
                                    {letter.pets?.name || 'Unknown'}
                                </h4>
                                <p className="text-xs text-gray-500">
                                    {formatDate(letter.created_at)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Split-Screen Editor */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedLetter ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <img
                                    src={getPetImage(selectedLetter)}
                                    alt={selectedLetter.pets?.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <h2 className="font-bold text-lg text-gray-900">
                                        {selectedLetter.pets?.name}의 답장
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(selectedLetter.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Split Screen Content */}
                        <div className="flex-1 p-4 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
                            {/* Left Column: User's Original Letter (Reference) */}
                            <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-gray-200 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                            {selectedLetter.pets?.name
                                                ? `${selectedLetter.pets.name}'s ${selectedLetter.pets.relationship || 'Guardian'}`
                                                : '유저의 편지'}
                                        </span>
                                    </div>
                                    {selectedLetter.originalUserLetter && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatDate(selectedLetter.originalUserLetter.created_at)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto">
                                    {selectedLetter.originalUserLetter ? (
                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {selectedLetter.originalUserLetter.content}
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 italic">
                                            원본 편지가 없습니다
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: AI Reply (Workspace) */}
                            <div className="flex flex-col overflow-hidden">
                                <div className="p-4 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm font-bold text-purple-600 uppercase tracking-wide">
                                            AI 답변 (수정)
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="flex-1 mx-4 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-lg leading-relaxed"
                                    placeholder="AI 답변 내용을 입력하세요..."
                                />
                                {/* Action Buttons */}
                                <div className="p-4 flex justify-end gap-3 shrink-0">
                                    <button
                                        onClick={handleRegenerate}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                        다시 생성
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2 px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        승인 및 전송
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>검수할 편지를 선택하세요</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
