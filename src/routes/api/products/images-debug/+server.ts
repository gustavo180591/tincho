import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

const prisma = new PrismaClient();

// POST /api/products/images - Upload product images
export async function POST({ request }: Parameters<RequestHandler>[0]) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const productId = formData.get('productId') as string;
    const position = parseInt(formData.get('position') as string) || 0;

    if (!image || !productId) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return json({ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (image.size > maxSize) {
      return json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const uploadDir = join(process.cwd(), 'static', 'uploads', productId);

    // Create directory if it doesn't exist
    try {
      mkdirSync(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
      return json({ error: 'Failed to create upload directory' }, { status: 500 });
    }

    // Convert File to Buffer and save
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const filePath = join(uploadDir, filename);
      writeFileSync(filePath, buffer);
    } catch (error) {
      console.error('Error saving file:', error);
      return json({ error: 'Failed to save image file' }, { status: 500 });
    }

    // Save image record to database
    const imageUrl = `/uploads/${productId}/${filename}`;

    try {
      const savedImage = await prisma.productImage.create({
        data: {
          productId,
          url: imageUrl,
          alt: `Product image ${position + 1}`,
          position
        }
      });

      return json(savedImage, { status: 201 });
    } catch (error) {
      console.error('Error saving image to database:', error);
      return json({ error: 'Failed to save image record to database' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
