import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { S3Client } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { timeFormatter } from '@/lib/utils'

export async function POST(request: Request) {
    try {
        // Validate content type
        const contentType = request.headers.get('content-type')
        if (contentType !== 'application/json') {
            return NextResponse.json(
                { error: 'Content-Type must be application/json' },
                { status: 415 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        
        if (!body.filename || !body.contentType) {
            return NextResponse.json(
                { error: 'filename and contentType are required' },
                { status: 400 }
            )
        }

        const { filename, contentType: fileType, bucketName } = body

        const client = new S3Client({ 
            region: 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        })

        const { url, fields } = await createPresignedPost(client, {
            Bucket: bucketName,
            Key: `${timeFormatter()}/${filename}-${Math.round(Math.random() * 1000)}`,
            Conditions: [
                ['content-length-range', 0, 10485760], // up to 10 MB
                ['starts-with', '$Content-Type', fileType],
            ],
            Fields: {
                acl: 'public-read',
                'Content-Type': fileType,
            },
        })

        return NextResponse.json({ url, fields })
    } catch (error) {
        console.error('Upload error:', error)
        
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid JSON format' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}