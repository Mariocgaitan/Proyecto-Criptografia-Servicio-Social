import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ProgressIndicator = ({
    step = 1,
    totalSteps = 3,
    onBack,
    isLoading = false,
    text = "Continue",
    className = "",
    formId
}) => {
    const isExpanded = step === 1;

    // The dot is 8px (w-2). The gap is 24px (gap-6).
    // The distance between the left edge of dot N and dot N+1 is 8 + 24 = 32px.
    // The initial width to perfectly wrap 1 dot with 8px padding on both sides is 24px (-8px left to +16px right)
    const progressWidth = `${24 + (step - 1) * 32}px`;

    return (
        <div className={cn("flex flex-col items-center justify-center gap-5 w-full", className)}>
            {/* Buttons container (Moved to Top) */}
            <div className="w-full max-w-sm">
                <div className="flex items-center w-full justify-between">
                    <div
                        className={cn(
                            "overflow-hidden flex shrink-0 items-center justify-end transition-all duration-300 ease-in-out",
                            isExpanded ? "w-0 opacity-0 pointer-events-none" : "w-[88px] opacity-100"
                        )}
                    >
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={isLoading}
                            className="w-[88px] py-3 text-white/80 flex items-center justify-center bg-white/10 font-normal rounded-full hover:bg-white/20 border border-white/20 transition-colors text-sm disabled:opacity-50 tracking-wide whitespace-nowrap">
                            Back
                        </button>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        form={formId}
                        style={{ width: isExpanded ? "100%" : "calc(100% - 96px)" }}
                        className="px-4 py-3 rounded-full text-white bg-white/20 hover:bg-white/30 border border-white/35 transition-[width,background-color] duration-300 ease-in-out disabled:opacity-75 disabled:cursor-not-allowed tracking-wide shadow-lg whitespace-nowrap overflow-hidden flex-shrink-0">
                        <div className="flex items-center font-[600] justify-center gap-2 text-sm w-full">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : step === totalSteps ? (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 15,
                                        mass: 0.5,
                                        bounce: 0.4
                                    }}>
                                    <CircleCheck size={16} />
                                </motion.div>
                            ) : null}
                            {isLoading ? "Cargando..." : text}
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6 relative mt-2">

                {Array.from({ length: totalSteps }).map((_, i) => {
                    const dot = i + 1;
                    return (
                        <div
                            key={dot}
                            className={cn(
                                "w-2 h-2 rounded-full relative z-10 transition-colors duration-300",
                                dot <= step ? "bg-white" : "bg-white/30"
                            )} />
                    );
                })}

                {/* Gray Transparent progress overlay (was Green) */}
                <motion.div
                    initial={false}
                    animate={{
                        width: progressWidth,
                        x: 0
                    }}
                    className="absolute -left-[8px] -top-[8px] h-6 bg-white/20 border border-white/30 backdrop-blur-md rounded-full"
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        mass: 0.8,
                        bounce: 0.25,
                        duration: 0.6
                    }} />
            </div>
        </div>
    );
}

export default ProgressIndicator