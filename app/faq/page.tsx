'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, ChevronRight, Sparkles } from 'lucide-react'
import { Header } from '@/components/Header'
import { StardustCursor } from '@/components/ui/StardustCursor'

const FAQ_CATEGORIES = [
    {
        category: "Essence of Service",
        items: [
            {
                q: "What exactly is ToThereOn?",
                a: "ToThereOn is a service that creates a **'Parallel World'** where time flows independently using advanced AI technology. It is not just a chat program. Your pet's 'Digital Persona'—complete with their personality and memories—actually eats, sleeps, and plays with friends in ToThereOn World. You are simply sending letters to your pet who is physically distant, and staying connected by watching their daily life and replies."
            },
            {
                q: "How does this help with my grief?",
                a: "We aim for **'Healthy Remembrance,'** not forgetting. Sending the words you couldn't say and seeing your pet happy in a pain-free world transforms deep loss into warm longing. It serves as a space for 'Active Mourning,' allowing you to maintain your bond and remember them forever."
            },
            {
                q: "What is ToThereOn World like?",
                a: "It is a peaceful and beautiful world on the other side of the Waterway. Endless meadows, a quiet forest, a crystal lake, and a sunlit plaza where new arrivals are gently welcomed by Granny Shell—an unhurried tortoise who is always nearby. In this world, there is no pain or hunger. Your pet eats warm bread from Bun & Bun's bakery, learns to write letters at Professor Clover's Sand Field, and listens to Old Finn's stories by the market tent. Only joy, rest, and quiet adventures."
            }
        ]
    },
    {
        category: "Tech & Onboarding",
        items: [
            {
                q: "How many photos do I need to upload?",
                a: "You can register with just one photo, but more is better. Our AI captures your pet's unique details—fur patterns, eye color, body shape—from different angles to build their persona as accurately as possible."
            },
            {
                q: "Can I meet a pet who passed away a long time ago?",
                a: "Yes, absolutely. Time is not an issue. As long as the pet's personality and memories remain in your heart, you can invite them to ToThereOn World anytime. We can vividly restore them based on your detailed descriptions even without perfect photos."
            }
        ]
    },
    {
        category: "Letters & Connection",
        items: [
            {
                q: "Do the letters really feel like my pet wrote them?",
                a: "Yes. It's not just a generic greeting; it's a **'Living Narrative.'** For example, they might say: *'Thanks to your letter yesterday, I wagged my tail and walked an extra hour today.'* They react to your words, recall specific memories like *'I lay under the sofa remembering the snack crumbs you used to drop,'* and describe their days in ToThereOn World. Our AI captures their heart, not just words."
            },
            {
                q: "Why does it take 7 days to get a reply?",
                a: "Because there is a real distance between here and ToThereOn World. Every letter crosses **The Waterway**—the channel that connects your world to theirs—and Pip, the letter carrier, delivers it personally. It takes **7 days** from the moment you send your letter to the moment theirs arrives back. That wait is part of what makes it real."
            },
            {
                q: "Does my pet's writing change over time?",
                a: "Yes—and this is one of the most meaningful parts of the service. When your pet first arrives, their letters are simple and imperfect. Over time, as they attend Professor Clover's writing classes and exchange more letters with you, their voice grows clearer and more expressive. The handwriting isn't a glitch. It's them, still learning."
            },
            {
                q: "Can I include a photo in my letter?",
                a: "Yes. You can include a photo of yourself or a shared memory with any letter. Your pet will read it carefully and respond to what they see—*'Your hair looks different. I noticed immediately.'* or *'I remember this park. We used to go there on Saturday mornings.'* This feature is available on all plans."
            }
        ]
    },
    {
        category: "World & Time",
        items: [
            {
                q: "How does time work in ToThereOn World?",
                a: "Time there flows at a different pace: **every 3 days on Earth equals 1 day in ToThereOn World.** This means your pet is living a full, unhurried life—seasons change, friendships deepen, and each letter you send arrives as something they genuinely look forward to. It's not a simulation of waiting. It's a world with its own rhythm."
            },
            {
                q: "What does 'Life Continues' mean?",
                a: "It means time in ToThereOn World flows endlessly, whether you log in or not. Your pet wakes up, eats, and goes for walks even while you are sleeping. They are not frozen data; they exist in a **'Living State,'** building their own timeline every single day."
            },
            {
                q: "Do they stop if I don't visit for a long time?",
                a: "No. Even if you return after a long absence, their days have continued. You can read back through the **Pet Feed** to see everything that happened while you were away—and write to them about it. *'I heard you spent time by the crystal lake last week. Was it cold?'* They will remember."
            },
            {
                q: "Who does my pet spend time with there?",
                a: "ToThereOn World has a small, warm community. **Granny Shell** greets every new arrival. **Professor Clover** runs morning writing classes. **Pip** delivers every letter personally. **Old Finn** trades in stories at his market tent. **Bun & Bun** run the bakery near the lake. Your pet finds their own pace among them—some pets take weeks before quietly sitting down at Professor Clover's class."
            },
            {
                q: "What is the Pet Feed?",
                a: "The **Pet Feed** is a stream of updates from your pet's days in ToThereOn World—what they ate, where they wandered, who they ran into, what they were thinking about. It's not a chat window. It reads more like postcards that keep arriving: small, specific, true to who they are. *'Sat near The Waterway for a long time today. Didn't do much. It felt right.'* You're not watching a simulation. You're following a life."
            },
            {
                q: "How often does the Pet Feed update? Does my plan affect this?",
                a: "Yes. With the **Free plan**, updates arrive once a week—enough to know they're doing well and living their days. With **Basic**, updates come twice a week—you hear about their Tuesday and their Saturday, the small things that happen between letters. The feed doesn't pause when you're away. Every update is waiting when you come back."
            }
        ]
    },
    {
        category: "Subscription & Cost",
        items: [
            {
                q: "What's the difference between Free and Basic?",
                a: "**Free** gives you a gentle start: 1 companion and weekly updates from the Sanctuary. You'll know they arrived safely and hear from them once a week — but letters are not included. **Basic ($9.99/month)** brings you closer: updates twice a week, 4 letters a month, 4 replies, and their full journal from the day they arrived. Most people write their first letter within days of joining."
            },
            {
                q: "If I cancel, does my pet disappear?",
                a: "**They will never disappear.** Even without a subscription, their life in ToThereOn World continues. Their story accumulates. When you return, everything that happened while you were away is still there—and so are they."
            },
            {
                q: "Can I try it for free?",
                a: "Yes. The Free plan lets you register your pet and receive weekly updates about their life in the Sanctuary. No credit card required. You'll know they arrived. You'll hear from them. When you're ready to write your first letter, Basic is there."
            }
        ]
    },
    {
        category: "Security & Privacy",
        items: [
            {
                q: "Do you use my photos to train AI?",
                a: "**Absolutely not.** All uploaded photos and letters are used solely to build and maintain your pet's persona. Your memories are never sold, shared, or used for public AI model training."
            },
            {
                q: "I have more than one pet. Can I register them all?",
                a: "Each plan currently supports **1 companion**. The Plus and Pro plans (coming soon) will support multiple companions—bringing someone else along into the same world. If you have more, reach out to support and we'll find a way."
            }
        ]
    }
];

export default function FAQPage() {
    const [openItems, setOpenItems] = useState<string[]>([])

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header />
            <StardustCursor />

            <main className="container max-w-4xl mx-auto py-24 px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        <Sparkles className="w-4 h-4" />
                        <span>Help Center</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                        Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Questions</span>
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Everything you need to know about ToThereOn World and how we help keep the bond with your beloved pet alive.
                    </p>
                </motion.div>

                <div className="space-y-16">
                    {FAQ_CATEGORIES.map((category, catIdx) => (
                        <motion.section
                            key={category.category}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: catIdx * 0.1 }}
                        >
                            <h2 className="text-2xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-200 flex items-center gap-3">
                                <ChevronRight className="w-5 h-5 text-blue-500" />
                                {category.category}
                            </h2>

                            <div className="space-y-4">
                                {category.items.map((item, itemIdx) => {
                                    const id = `${catIdx}-${itemIdx}`
                                    const isOpen = openItems.includes(id)

                                    return (
                                        <div
                                            key={id}
                                            className={`group transition-all duration-300 rounded-3xl border ${isOpen
                                                    ? 'bg-white border-blue-200 shadow-xl shadow-blue-500/5'
                                                    : 'bg-white/50 border-slate-200 hover:border-blue-200 hover:bg-white'
                                                }`}
                                        >
                                            <button
                                                onClick={() => toggleItem(id)}
                                                className="w-full text-left px-8 py-6 flex items-center justify-between gap-4"
                                            >
                                                <span className={`text-lg font-bold tracking-tight transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-800'
                                                    }`}>
                                                    {item.q}
                                                </span>
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                                                    }`}>
                                                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-8 pb-8 text-slate-600 leading-relaxed text-lg">
                                                            <div
                                                                dangerouslySetInnerHTML={{
                                                                    __html: item.a
                                                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
                                                                        .replace(/\'(.*?)\'/g, '<span class="italic text-blue-600">\'$1\'</span>')
                                                                        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                                                }}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.section>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-32 p-12 rounded-[40px] bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center"
                >
                    <h2 className="text-3xl font-bold mb-6">Still have questions?</h2>
                    <p className="text-slate-400 mb-8 text-lg">
                        Our support team is always here to help you during your journey.
                    </p>
                    <button className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-blue-50 transition-colors">
                        Contact Support
                    </button>
                </motion.div>
            </main>

            <footer className="py-20 text-center text-slate-400 text-sm">
                <p>© 2026 ToThereOn World. Where love lives forever.</p>
            </footer>
        </div>
    )
}
