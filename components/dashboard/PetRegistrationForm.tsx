'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, X, ChevronRight, ChevronLeft, PawPrint, Calendar, Camera, Check, Clock, Loader2 } from 'lucide-react'
import { LanguageSupportBanner } from '@/components/pets/LanguageSupportBanner'
import { toast } from 'sonner'

type Step = 'basic' | 'details' | 'photos'

interface SchemaField {
    id: string
    field_name: string
    label_kr: string
    label_en: string
    field_type: 'text' | 'textarea' | 'date' | 'select' | 'file' | 'number'
    is_required: boolean
    options: any[]
    order_index: number
}

// Fixed steps structure for UI - we will distribute dynamic fields into these
const STEPS = [
    { id: 'basic', title: 'Basic Info', icon: PawPrint },
    { id: 'details', title: 'Life Journey', icon: Calendar },
    { id: 'photos', title: 'Memories', icon: Camera },
]

export function PetRegistrationForm() {
    const router = useRouter()
    const supabase = createClient()
    const [currentStep, setCurrentStep] = useState<number>(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isSchemaLoading, setIsSchemaLoading] = useState(true)
    const [schema, setSchema] = useState<SchemaField[]>([])

    // Dynamic form data storage
    const [formData, setFormData] = useState<Record<string, any>>({
        species: 'dog', // Default
    })

    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch Schema on Mount
    useEffect(() => {
        const fetchSchema = async () => {
            const { data, error } = await supabase
                .from('pet_registration_schema')
                .select('*')
                .eq('is_active', true)
                .order('order_index')

            if (error) {
                console.error('Schema fetch error:', error)
                toast.error('Failed to load registration form')
            } else {
                setSchema(data || [])
            }
            setIsSchemaLoading(false)
        }
        fetchSchema()
    }, [])

    const handleInputChange = (field: SchemaField, value: any) => {
        setFormData(prev => ({ ...prev, [field.field_name]: value }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB')
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                setImageFile(file)
                setImagePreview(reader.result as string)
                // Also set in formData for validation presence check
                setFormData(prev => ({ ...prev, image: 'file-selected' }))
            }
            reader.readAsDataURL(file)
        }
    }

    // Distribute fields to steps based on field_name or order
    // This logic maps the dynamic fields to the 3 hardcoded visual steps
    // Basic: name, species, breed, gender
    // Details: passed_date, birth_date, weight
    // Photos: image
    // Others: Append to Basic or Details based on type? Or just put all extra in Details.

    const getFieldsForStep = (stepIndex: number) => {
        if (stepIndex === 0) {
            // Basic: 0-30 order usually
            return schema.filter(f => ['name', 'species', 'breed', 'gender'].includes(f.field_name) || (!['passed_date', 'birth_date', 'weight', 'image'].includes(f.field_name) && f.order_index <= 30))
        }
        if (stepIndex === 1) {
            // Details
            return schema.filter(f => ['passed_date', 'birth_date', 'weight'].includes(f.field_name) || (!['name', 'species', 'breed', 'gender', 'image'].includes(f.field_name) && f.order_index > 30))
        }
        if (stepIndex === 2) {
            // Photos
            return schema.filter(f => f.field_name === 'image')
        }
        return []
    }

    const validateStep = (step: number): boolean => {
        const fields = getFieldsForStep(step)
        for (const field of fields) {
            if (field.is_required) {
                const value = formData[field.field_name]
                if (!value || (typeof value === 'string' && !value.trim())) {
                    toast.error(`Please enter ${field.label_en}`)
                    return false
                }
            }
        }
        return true
    }

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
        }
    }

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0))
    }

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return

        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            let photoUrl = null

            // 1. Upload Photo
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('pet-photos')
                    .upload(fileName, imageFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('pet-photos')
                    .getPublicUrl(fileName)

                photoUrl = publicUrl
            }

            const normalizeDate = (dateStr: string | null): string | null => {
                if (!dateStr) return null
                const trimmed = dateStr.trim()
                // YYYY-MM format (length 7) → append -01
                if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`
                return trimmed
            }

            const insertPayload: any = {
                user_id: user.id,
                name: formData.name,
                species: formData.species,
                breed: formData.breed || null,
                gender: formData.gender || null,
                birth_date: normalizeDate(formData.birth_date),
                passed_date: normalizeDate(formData.passed_date),
                weight_kg: formData.weight ? parseFloat(formData.weight) : null,
                photos: photoUrl ? [photoUrl] : [],
                persona_generated: false,
            }

            const { error: insertError } = await supabase
                .from('pets')
                .insert(insertPayload)

            if (insertError) throw insertError

            toast.success('Pet registered successfully!')
            router.refresh()
            router.push('/dashboard')

        } catch (error: any) {
            console.error('Registration error:', error)
            toast.error(error.message || 'Failed to register pet')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSchemaLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
    }

    // Hardcoded English label overrides to ensure correct display regardless of DB values
    const FIELD_LABEL_EN: Record<string, string> = {
        birth_date: 'Date of Birth',
        passed_date: 'Date of Passing',
        name: 'Name',
        species: 'Species',
        breed: 'Breed',
        gender: 'Gender',
        weight: 'Weight (kg)',
        image: 'Photo',
    }

    const renderField = (field: SchemaField) => {
        const commonClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
        const displayLabel = FIELD_LABEL_EN[field.field_name] || field.label_en
        const label = <label className="block text-sm font-semibold text-gray-700 mb-2">{displayLabel} {field.is_required && <span className="text-red-500">*</span>}</label>

        if (field.field_type === 'select') {
            return (
                <div key={field.id}>
                    {label}
                    <select
                        value={formData[field.field_name] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className={commonClasses}
                    >
                        <option value="">Select...</option>
                        {Array.isArray(field.options) ? field.options.map((opt: any) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        )) : null}
                    </select>
                </div>
            )
        }

        if (field.field_type === 'textarea') {
            return (
                <div key={field.id}>
                    {label}
                    <textarea
                        value={formData[field.field_name] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className={commonClasses}
                        rows={3}
                    />
                </div>
            )
        }

        if (field.field_type === 'file' && field.field_name === 'image') {
            return (
                <div key={field.id}>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">A Cherished Memory</h2>
                        <p className="text-gray-500">Upload a photo to create their digital avatar.</p>
                    </div>
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden group"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ minHeight: '300px' }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {imagePreview ? (
                            <>
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-bold flex items-center gap-2">
                                        <Camera className="w-5 h-5" /> Change Photo
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-gray-700">Click to upload photo</p>
                                <p className="text-sm text-gray-500 mt-2">JPG, PNG up to 5MB</p>
                            </>
                        )}
                    </div>
                </div>
            )
        }

        return (
            <div key={field.id}>
                {label}
                <input
                    type={field.field_type === 'number' ? 'number' : 'text'}
                    value={formData[field.field_name] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={commonClasses}
                    placeholder={field.field_type === 'date' ? 'YYYY-MM (e.g. 2015-03)' : `Enter ${displayLabel}`}
                />
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Multilingual support notice */}
            <LanguageSupportBanner />

            {/* Progress Steps */}
            <div className="flex justify-between mb-10 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 -translate-y-1/2" />
                {STEPS.map((step, index) => {
                    const isActive = index === currentStep
                    const isCompleted = index < currentStep
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                            <div
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2
                                    ${isActive || isCompleted
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-white border-gray-300 text-gray-400'}
                                `}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                            </div>
                            <span
                                className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                                {step.title}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Form Card */}
            <motion.div
                layout
                className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-gray-100"
            >
                <div className="space-y-6">
                    {/* Header for Step */}
                    {currentStep !== 2 && (
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold mb-2">
                                {currentStep === 0 ? "Tell us about them" : "Their Time with Us"}
                            </h2>
                            <p className="text-gray-500">
                                {currentStep === 0 ? "Every detail helps us preserve their memory." : "Honoring the dates that marked their journey."}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {getFieldsForStep(currentStep).map(renderField)}
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                    {currentStep > 0 ? (
                        <button
                            onClick={prevStep}
                            className="flex items-center gap-2 px-6 py-3 text-gray-500 font-bold hover:text-gray-900 transition-colors"
                            disabled={isLoading}
                        >
                            <ChevronLeft className="w-5 h-5" /> Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {currentStep < STEPS.length - 1 ? (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                        >
                            Next Step <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-10 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Registering...' : 'Complete Registration'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
