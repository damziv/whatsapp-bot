import React from 'react'
import Hero from '@/app/components/Home/Hero'
import Aboutus from '@/app/components/Home/AboutUs'
import Dedicated from '@/app/components/Home/Dedicated'
import Digital from '@/app/components/Home/Digital'
import Beliefs from '@/app/components/Home/Beliefs'
import FAQ from '@/app/components/Home/FAQ'
import Join from '@/app/components/Home/Joinus'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QRevent.Pro ',
}

export default function Home() {
  return (
    <main>
      <Hero />
      <Aboutus />
      <Dedicated />
      <Digital />
      <Beliefs />
      <FAQ />
      <Join />

    </main>
  )
}
