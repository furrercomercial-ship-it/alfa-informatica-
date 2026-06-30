import HeroBanner       from './components/HeroBanner'
import CategoriesSection from './components/CategoriesSection'
import OffersSection     from './components/OffersSection'
import FeaturedProducts  from './components/FeaturedProducts'
import BrandsSection     from './components/BrandsSection'
import BenefitsSection   from './components/BenefitsSection'
import Footer            from './components/Footer'

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoriesSection />
      <OffersSection />
      <FeaturedProducts />
      <BrandsSection />
      <BenefitsSection />
      <Footer />
    </>
  )
}
