import React, { ReactNode, useState } from "react"

interface FormSectionProps {
	title: string
	children: ReactNode
	className?: string
	defaultOpen?: boolean
	colorScheme?: "blue" | "green" | "amber" | "violet" | "fuchsia" | "rose" | "cyan" | "lime"
}

const colorMap = {
	blue: {
		title: "text-blue-700",
		titleHover: "hover:text-blue-800",
		chevronHover: "hover:text-blue-600",
		headerBg: "bg-blue-50",
		headerBorder: "border-blue-200",
		bodyBorder: "border-blue-200",
		bodyBg: "bg-blue-50",
	},
	green: {
		title: "text-green-700",
		titleHover: "hover:text-green-800",
		chevronHover: "hover:text-green-600",
		headerBg: "bg-green-50",
		headerBorder: "border-green-200",
		bodyBorder: "border-green-200",
		bodyBg: "bg-green-50",
	},
	amber: {
		title: "text-amber-700",
		titleHover: "hover:text-amber-800",
		chevronHover: "hover:text-amber-600",
		headerBg: "bg-amber-50",
		headerBorder: "border-amber-200",
		bodyBorder: "border-amber-200",
		bodyBg: "bg-amber-50",
	},
	violet: {
		title: "text-violet-700",
		titleHover: "hover:text-violet-800",
		chevronHover: "hover:text-violet-600",
		headerBg: "bg-violet-50",
		headerBorder: "border-violet-200",
		bodyBorder: "border-violet-200",
		bodyBg: "bg-violet-50",
	},
	fuchsia: {
		title: "text-fuchsia-700",
		titleHover: "hover:text-fuchsia-800",
		chevronHover: "hover:text-fuchsia-600",
		headerBg: "bg-fuchsia-50",
		headerBorder: "border-fuchsia-200",
		bodyBorder: "border-fuchsia-200",
		bodyBg: "bg-fuchsia-50",
	},
	rose: {
		title: "text-rose-700",
		titleHover: "hover:text-rose-800",
		chevronHover: "hover:text-rose-600",
		headerBg: "bg-rose-50",
		headerBorder: "border-rose-200",
		bodyBorder: "border-rose-200",
		bodyBg: "bg-rose-50",
	},
	lime: {
		title: "text-lime-700",
		titleHover: "hover:text-lime-800",
		chevronHover: "hover:text-lime-600",
		headerBg: "bg-lime-50",
		headerBorder: "border-lime-200",
		bodyBorder: "border-lime-200",
		bodyBg: "bg-lime-50",
	},
	cyan: {
		title: "text-cyan-700",
		titleHover: "hover:text-cyan-800",
		chevronHover: "hover:text-cyan-600",
		headerBg: "bg-cyan-50",
		headerBorder: "border-cyan-200",
		bodyBorder: "border-cyan-200",
		bodyBg: "bg-cyan-50",
	},
}

const FormSection: React.FC<FormSectionProps> = ({ title, children, className = "", defaultOpen = true, colorScheme = "blue" }) => {
	const [isOpen, setIsOpen] = useState(defaultOpen)
	const colors = colorMap[colorScheme]

	const toggleSection = () => {
		setIsOpen(!isOpen)
	}

	return (
		<div className={`relative mt-10 mb-15 form-section-dropdown-fix ${className}`}>
			<div
				className={`absolute -top-9 ${colors.headerBg} px-4 border-t border-l border-r ${colors.headerBorder} rounded-t-lg pt-1 ${
					isOpen ? "" : "border-b rounded-b-lg pb-1 w-full"
				}`}
			>
				<div className="flex items-center justify-between">
					<h2
						className={`text-base md:text-lg font-semibold ${colors.title} ${
							!isOpen ? `cursor-pointer ${colors.titleHover} transition-colors duration-200` : ""
						}`}
						onClick={!isOpen ? toggleSection : undefined}
					>
						{title}
					</h2>
					<button
						type="button"
						onClick={toggleSection}
						className={`ml-4 p-1 text-gray-500 ${colors.chevronHover} rounded-lg transition-all duration-200 focus:outline-none cursor-pointer`}
						aria-label={isOpen ? "Chiudi sezione" : "Apri sezione"}
					>
						<i
							className={`fas fa-chevron-down text-sm transition-transform duration-300 ease-in-out ${
								isOpen ? "rotate-0" : "-rotate-90"
							}`}
						></i>
					</button>
				</div>
			</div>
			<div className={`${colors.bodyBg} rounded-b-lg rounded-r-lg ${isOpen ? `border-b-0 shadow-sm border ${colors.bodyBorder}` : "overflow-hidden"}`}>
				<div
					className={`transition-all duration-200 ease-in-out ${
						isOpen ? "max-h-none opacity-100 p-3 md:p-6 pt-8 overflow-visible" : "max-h-0 opacity-0 p-0 pt-0 overflow-hidden"
					}`}
				>
					{children}
				</div>
			</div>
		</div>
	)
}

export default FormSection
