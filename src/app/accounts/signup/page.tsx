import { Suspense } from 'react'
import Comps from './clientComps'

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Comps/>
        </Suspense>
    )
}