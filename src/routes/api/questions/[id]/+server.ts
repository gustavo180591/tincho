import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Get a specific question with its answers
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const { id } = params;
    const session = await locals.getSession();
    
    // Get question with answers
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            storeId: true,
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

    if (!question) {
      return json(errors.notFound('Pregunta no encontrada'), { status: 404 });
    }

    // Check if user is the seller of the product
    const isSeller = session?.user?.id && await prisma.storeUser.findFirst({
      where: {
        userId: session.user.id,
        storeId: question.product.storeId,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
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
      product: {
        id: question.product.id,
        title: question.product.title,
        slug: question.product.slug,
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
      canAnswer: isSeller && !question.answers.some(a => a.isSeller),
    };

    return json(success(response));
  } catch (error) {
    console.error('Error al obtener la pregunta:', error);
    return json(errors.internalServerError('Error al obtener la pregunta'), { status: 500 });
  }
};
