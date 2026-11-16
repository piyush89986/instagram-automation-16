import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI as string).then(async () => {
    console.log('Connected to DB');
    const { Product } = await import('./src/core/database/models/Product');
    const { Workspace } = await import('./src/core/database/models/Workspace');
    
    // Create a dummy workspace
    const workspace = await Workspace.create({ name: 'Test WS', tenantId: 'test-tenant' });
    
    // Insert a dummy product
    const p = await Product.create({
        workspaceId: workspace._id,
        name: "honda sp shine 125",
        description: "beast",
        price: 180000
    });
    console.log('Inserted product:', p.name, 'with workspaceId:', p.workspaceId);

    const query = "hunter 350";
    const searchTerms = query.trim().split(/\s+/).map((w: string) => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).filter((w: string) => w.length > 1);
    const regex = new RegExp(searchTerms.join('|'), 'i');
    console.log('Regex for hunter 350:', regex);

    const searchProducts = await Product.find({ 
        workspaceId: workspace._id.toString(), // passed as string just like in code
        $or: [{ name: regex }, { description: regex }]
    });
    console.log('Found with Regex (hunter 350):', searchProducts.map(p => p.name));

    const query2 = "Sp shine";
    const searchTerms2 = query2.trim().split(/\s+/).map((w: string) => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).filter((w: string) => w.length > 1);
    const regex2 = new RegExp(searchTerms2.join('|'), 'i');
    console.log('Regex for Sp shine:', regex2);

    const searchProducts2 = await Product.find({ 
        workspaceId: workspace._id.toString(),
        $or: [{ name: regex2 }, { description: regex2 }]
    });
    console.log('Found with Regex (Sp shine):', searchProducts2.map(p => p.name));

    // cleanup
    await Product.deleteMany({});
    await Workspace.deleteMany({});
    
    process.exit(0);
}).catch(console.error);
