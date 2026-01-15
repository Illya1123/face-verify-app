interface Props {
    children: React.ReactNode
}

const Section = ({ children }: Props) => <section className="w-full h-full flex flex-col">{children}</section>

export default Section
