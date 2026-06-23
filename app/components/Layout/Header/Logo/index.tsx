import Link from 'next/link'

const Logo: React.FC = () => {
  return (
    <Link href='/' aria-label='QRevent — home' className='flex items-center gap-2.5'>
      <svg
        width='34'
        height='34'
        viewBox='0 0 100 100'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'
        className='shrink-0'
      >
        <defs>
          <linearGradient id='qrlogo' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stopColor='#577fff' />
            <stop offset='1' stopColor='#3d61f1' />
          </linearGradient>
        </defs>
        <rect width='100' height='100' rx='26' fill='url(#qrlogo)' />
        <rect x='22' y='22' width='28' height='28' rx='7' fill='none' stroke='#fff' strokeWidth='7' />
        <rect x='31' y='31' width='10' height='10' rx='2' fill='#fff' />
        <rect x='60' y='22' width='9' height='9' rx='2' fill='#fff' />
        <rect x='71' y='35' width='9' height='9' rx='2' fill='#fff' />
        <rect x='60' y='60' width='9' height='9' rx='2' fill='#fff' />
        <rect x='22' y='60' width='9' height='9' rx='2' fill='#fff' />
        <rect x='22' y='72' width='9' height='9' rx='2' fill='#fff' opacity='0.85' />
        <rect x='46' y='71' width='7' height='7' rx='2' fill='#fff' />
        <rect x='73' y='60' width='5' height='9' rx='2' fill='#fff' opacity='0.85' />
      </svg>
      <span className='text-2xl font-bold tracking-tight leading-none'>QRevent</span>
    </Link>
  )
}

export default Logo
