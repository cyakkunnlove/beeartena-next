import Image from 'next/image';
import Link from 'next/link';
import HeroSection from '@/components/home/HeroSection';
import MenuSection from '@/components/home/MenuSection';
import PlanSection from '@/components/home/PlanSection';
import CareSection from '@/components/home/CareSection';
import ProfileSection from '@/components/home/ProfileSection';
import MemberBenefitsSection from '@/components/home/MemberBenefitsSection';
import GallerySection from '@/components/home/GallerySection';
import FAQSection from '@/components/home/FAQSection';
import ContactSection from '@/components/home/ContactSection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <MenuSection />
      <PlanSection />
      <CareSection />
      <ProfileSection />
      <MemberBenefitsSection />
      <GallerySection />
      <FAQSection />
      <ContactSection />
    </>
  );
}