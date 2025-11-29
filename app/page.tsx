import CareSection from '@/components/home/CareSection'
import ContactSection from '@/components/home/ContactSection'
import FAQSection from '@/components/home/FAQSection'
import GallerySection from '@/components/home/GallerySection'
import HeroSection from '@/components/home/HeroSection'
import NewsSection from '@/components/home/NewsSection'
import MemberBenefitsSection from '@/components/home/MemberBenefitsSection'
import MenuSection from '@/components/home/MenuSection'
import PlanSection from '@/components/home/PlanSection'
import ProfileSection from '@/components/home/ProfileSection'

export default function Home() {
  return (
    <>
      <HeroSection />
      <NewsSection />
      <MenuSection />
      <PlanSection />
      <CareSection />
      <ProfileSection />
      <MemberBenefitsSection />
      <GallerySection />
      <FAQSection />
      <ContactSection />
    </>
  )
}
