'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Species, Gender, Relationship, PetFormData } from '@/lib/types/database'
import { X, Upload, Camera, ChevronDown } from 'lucide-react'
import { LanguageSupportBanner } from './LanguageSupportBanner'

const SPECIES_OPTIONS: { value: Species; label: string; emoji: string }[] = [
    { value: 'dog', label: 'Dog', emoji: '🐕' },
    { value: 'cat', label: 'Cat', emoji: '🐱' },
    { value: 'rabbit', label: 'Rabbit', emoji: '🐰' },
    { value: 'bird', label: 'Bird', emoji: '🐦' },
    { value: 'hamster', label: 'Hamster', emoji: '🐹' },
    { value: 'other', label: 'Other', emoji: '🐾' },
]

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
]

const RELATIONSHIP_OPTIONS: { value: Relationship; label: string }[] = [
    { value: 'mom', label: 'Mom' },
    { value: 'dad', label: 'Dad' },
    { value: 'friend', label: 'Friend' },
    { value: 'sister', label: 'Sister' },
    { value: 'brother', label: 'Brother' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'other', label: 'Other' },
]

interface PetRegistrationFormProps {
    onSuccess?: (petId: string) => void
    maxPetsReached?: boolean
}

export function PetRegistrationForm({ onSuccess, maxPetsReached }: PetRegistrationFormProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [photosPreviews, setPhotosPreviews] = useState<string[]>([])
    const [photosFiles, setPhotosFiles] = useState<File[]>([])

    const [formData, setFormData] = useState({
        name: '',
        birth_date: '',
        passed_date: '',
        species: '' as Species | '',
        breed: '',
        weight_kg: '',
        gender: '' as Gender | '',
        relationship: '' as Relationship | '',
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length + photosFiles.length > 5) {
            setError('Maximum 5 photos allowed')
            return
        }

        // Validate file types and sizes
        const validFiles: File[] = []
        const validPreviews: string[] = []

        files.forEach(file => {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError('Only JPG, PNG, and WebP images are allowed')
                return
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('Each image must be less than 5MB')
                return
            }
            validFiles.push(file)
            validPreviews.push(URL.createObjectURL(file))
        })

        setPhotosFiles(prev => [...prev, ...validFiles])
        setPhotosPreviews(prev => [...prev, ...validPreviews])
    }

    const removePhoto = (index: number) => {
        URL.revokeObjectURL(photosPreviews[index])
        setPhotosPreviews(prev => prev.filter((_, i) => i !== index))
        setPhotosFiles(prev => prev.filter((_, i) => i !== index))
    }

    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            setError('Please enter your pet\'s name')
            return false
        }
        if (!formData.passed_date) {
            setError('Please enter the date your pet passed')
            return false
        }
        if (!formData.species) {
            setError('Please select your pet\'s species')
            return false
        }
        if (!formData.gender) {
            setError('Please select your pet\'s gender')
            return false
        }
        if (photosFiles.length === 0) {
            setError('Please upload at least one photo of your pet')
            return false
        }
        if (formData.birth_date && formData.passed_date && formData.birth_date > formData.passed_date) {
            setError('Birth date must be before the passing date')
            return false
        }
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return
        if (maxPetsReached) {
            setError('You have reached the maximum number of pets allowed')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // 1. Upload photos to Supabase Storage
            const photoUrls: string[] = []

            for (const file of photosFiles) {
                const timestamp = Date.now()
                const fileExt = file.name.split('.').pop()
                const fileName = `${user.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('pet-photos')
                    .upload(fileName, file)

                if (uploadError) {
                    throw new Error(`Failed to upload photo: ${uploadError.message}`)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('pet-photos')
                    .getPublicUrl(uploadData.path)

                photoUrls.push(publicUrl)
            }

            // Helper function to normalize date format (YYYY-MM -> YYYY-MM-01)
            const normalizeDate = (dateStr: string | null): string | null => {
                if (!dateStr) return null
                // If format is YYYY-MM (length 7), append -01
                if (dateStr.length === 7) {
                    return `${dateStr}-01`
                }
                return dateStr
            }

            // 2. Create pet record
            const { data: pet, error: petError } = await supabase
                .from('pets')
                .insert({
                    user_id: user.id,
                    name: formData.name.trim(),
                    birth_date: normalizeDate(formData.birth_date),
                    passed_date: normalizeDate(formData.passed_date),
                    species: formData.species,
                    breed: formData.breed.trim() || null,
                    weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                    gender: formData.gender,
                    relationship: formData.relationship || null,
                    photos: photoUrls,
                })
                .select()
                .single()

            if (petError) {
                throw new Error(`Failed to register pet: ${petError.message}`)
            }

            // Success!
            if (onSuccess) {
                onSuccess(pet.id)
            } else {
                router.push('/dashboard')
            }

        } catch (err) {
            console.error('Pet registration error:', err)
            setError(err instanceof Error ? err.message : 'Failed to register pet')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (maxPetsReached) {
        return (
            <div className="text-center p-8">
                <div className="text-6xl mb-4">🐾</div>
                <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    Maximum Pets Reached
                </h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    You have reached the maximum number of pets allowed on your current plan.
                    Upgrade to register more pets.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Multilingual support notice */}
            <LanguageSupportBanner />

            {/* Photo Upload Section */}
            <div className="space-y-4">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Photos <span style={{ color: 'var(--color-primary)' }}>*</span>
                    <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-tertiary)' }}>
                        (1-5 photos, max 5MB each)
                    </span>
                </label>

                <div className="flex flex-wrap gap-4">
                    {photosPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                            <img
                                src={preview}
                                alt={`Pet photo ${index + 1}`}
                                className="w-24 h-24 object-cover rounded-xl border-2"
                                style={{ borderColor: 'var(--color-border-light)' }}
                            />
                            <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}

                    {photosFiles.length < 5 && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:border-[var(--color-primary)] hover:bg-[rgba(74,144,226,0.05)]"
                            style={{ borderColor: 'var(--color-border-light)', color: 'var(--color-text-tertiary)' }}
                        >
                            <Camera size={24} />
                            <span className="text-xs">Add Photo</span>
                        </button>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                />
            </div>

            {/* Name */}
            <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Pet's Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your pet's name"
                    className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,144,226,0.1)]"
                    style={{ borderColor: 'var(--color-border-light)' }}
                />
            </div>

            {/* Species & Breed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Species <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <div className="relative">
                        <select
                            name="species"
                            value={formData.species}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-xl border-2 appearance-none transition-all focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,144,226,0.1)]"
                            style={{ borderColor: 'var(--color-border-light)' }}
                        >
                            <option value="">Select species</option>
                            {SPECIES_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.emoji} {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={20}
                            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Breed
                    </label>
                    <input
                        type="text"
                        name="breed"
                        value={formData.breed}
                        onChange={handleInputChange}
                        placeholder="e.g., Golden Retriever / 골든 리트리버 / ゴールデンレトリーバー"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,144,226,0.1)]"
                        style={{ borderColor: 'var(--color-border-light)' }}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        Any language works — we'll match the breed automatically.
                    </p>
                </div>
            </div>

            {/* Gender & Weight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Gender <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <div className="flex gap-4">
                        {GENDER_OPTIONS.map(option => (
                            <label
                                key={option.value}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.gender === option.value
                                    ? 'border-[var(--color-primary)] bg-[rgba(74,144,226,0.08)]'
                                    : 'border-[var(--color-border-light)] hover:border-[var(--color-primary)]'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="gender"
                                    value={option.value}
                                    checked={formData.gender === option.value}
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                <span className="text-lg">{option.value === 'male' ? '♂' : '♀'}</span>
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Weight (kg)
                    </label>
                    <input
                        type="number"
                        name="weight_kg"
                        value={formData.weight_kg}
                        onChange={handleInputChange}
                        placeholder="e.g., 5.5"
                        step="0.1"
                        min="0"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,144,226,0.1)]"
                        style={{ borderColor: 'var(--color-border-light)' }}
                    />
                </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Date of Birth
                    </label>
                    <input
                        type="text"
                        name="birth_date"
                        value={formData.birth_date}
                        onChange={handleInputChange}
                        placeholder="YYYY-MM (e.g. 2010-06)"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,144,226,0.1)]"
                        style={{ borderColor: 'var(--color-border-light)' }}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Date of Passing <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <input
                        type="text"
                        name="passed_date"
                        value={formData.passed_date}
                        onChange={handleInputChange}
                        placeholder="YYYY-MM (e.g. 2023-11)"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,144,226,0.1)]"
                        style={{ borderColor: 'var(--color-border-light)' }}
                    />
                </div>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Your Relationship
                </label>
                <div className="flex flex-wrap gap-3">
                    {RELATIONSHIP_OPTIONS.map(option => (
                        <label
                            key={option.value}
                            className={`px-4 py-2 rounded-full cursor-pointer transition-all text-sm ${formData.relationship === option.value
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            <input
                                type="radio"
                                name="relationship"
                                value={option.value}
                                checked={formData.relationship === option.value}
                                onChange={handleInputChange}
                                className="hidden"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full button-primary py-4 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Registering...
                    </span>
                ) : (
                    'Register Pet'
                )}
            </button>

            {/* Helper Text */}
            <p className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                Provide basic info to begin the journey of meeting your pet.
                <br />
                Register basics first, then share your pet's unique stories.
            </p>
        </form>
    )
}
