import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { errors, success } from '$lib/api/response';

// Add an answer to a question
export const POST: RequestHandler = async ({ request, params, locals }) => {
  try {
    const session = await locals.getSession();
    if (!session?.user?.id) {
      return json(errors.unauthorized('Debes iniciar sesión para responder'), { status: 401 });
    }

    const { id: questionId } = params;
    const { content, isAnonymous = false } = await request.json();

    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      return json(errors.badRequest('La respuesta debe tener al menos 3 caracteres'), { status: 400 });
    }

    // Get question with product info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        product: {
          select: {
            storeId: true,
          },
        },
        answers: {
          where: { isSeller: true },
          select: { id: true },
        },
      },
    });

    if (!question) {
      return json(errors.notFound('Pregunta no encontrada'), { status: 404 });
    }

    // Check if user is the seller of the product
    const isSeller = await prisma.storeUser.findFirst({
      where: {
        userId: session.user.id,
        storeId: question.product.storeId,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    });

    // Only allow one seller answer per question
    if (isSeller && question.answers.length > 0) {
      return json(errors.badRequest('Ya existe una respuesta del vendedor para esta pregunta'), { status: 400 });
    }

    // Create answer
    const answer = await prisma.answer.create({
      data: {
        content: content.trim(),
        isSeller: !!isSeller,
        isAnonymous: !!isAnonymous,
        questionId,
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
    };

    // TODO: Send notification to the user who asked the question

    return json(success(response), { status: 201 });
  } catch (error) {
    console.error('Error al crear la respuesta:', error);
    return json(errors.internalServerError('Error al crear la respuesta'), { status: 500 });
  }
};
