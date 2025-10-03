import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get all questions for a product
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const { productId } = params;
    const session = await locals.getSession();
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const skip = (page - 1) * limit;
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const order = url.searchParams.get('order') || 'desc';

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true }
    });

    if (!product) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    // Build where clause
    const where: any = { 
      productId,
      // Only show answered questions to non-authenticated users
      ...(!session?.user?.id && { answers: { some: {} } })
    };

    // Get total count for pagination
    const total = await prisma.question.count({ where });

    // Get questions with pagination
    const questions = await prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        answers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { answers: true },
        },
      },
    });

    // Format response
    const response = {
      items: questions.map(question => ({
        id: question.id,
        content: question.content,
        isAnonymous: question.isAnonymous,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
        user: question.isAnonymous ? null : {
          id: question.user.id,
          name: question.user.name,
          image: question.user.image,
        },
        answerCount: question._count.answers,
        answers: question.answers.map(answer => ({
          id: answer.id,
          content: answer.content,
          isSeller: answer.isSeller,
          isAnonymous: answer.isAnonymous,
          createdAt: answer.createdAt.toISOString(),
          updatedAt: answer.updatedAt.toISOString(),
          user: answer.isAnonymous ? null : {
            id: answer.user.id,
            name: answer.user.name,
            image: answer.user.image,
          },
        })),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener las preguntas:', error);
    return json(errors.internalServerError('Error al obtener las preguntas'), { status: 500 });
  }
};

// Create a new question
export const POST: RequestHandler = async ({ request, params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para hacer una pregunta'), { status: 401 });
    }

    const { productId } = params;
    const { content, isAnonymous = false } = await request.json();

    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return json(errors.badRequest('La pregunta debe tener al menos 5 caracteres'), { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, storeId: true },
    });

    if (!product) {
      return json(errors.notFound('Producto no encontrado'), { status: 404 });
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        content: content.trim(),
        isAnonymous: !!isAnonymous,
        productId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Format response
    const response = {
      id: question.id,
      content: question.content,
      isAnonymous: question.isAnonymous,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
      user: question.isAnonymous ? null : {
        id: question.user.id,
        name: question.user.name,
        image: question.user.image,
      },
      answerCount: 0,
      answers: [],
    };

    // TODO: Send notification to store owner

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear la pregunta:', error);
    return json(errors.internalServerError('Error al crear la pregunta'), { status: 500 });
  }
};
