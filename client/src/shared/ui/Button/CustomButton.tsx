import "./CustomButton.module.css"

interface CustomButtonProps {
    children: React.ReactNode
}

const CustomButton = ({ children }: CustomButtonProps) => {
    return (
        <button className="customButton">{children}</button>
    )
}

export default CustomButton