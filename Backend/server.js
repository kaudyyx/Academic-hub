// Importa as bibliotecas necessárias
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

// Inicia o servidor
const app = express();
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos do diretório 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Conecta ao MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Academichub', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Conectado ao MongoDB!'))
  .catch(err => console.error('Erro na conexão com o MongoDB:', err));

// Define o esquema do usuário
const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    senha: { type: String, required: true },
    biografia: { type: String, default: '' }, // Novo campo para biografia
    corFundo: { type: String, default: '#f0f2f5' } // Novo campo para cor de fundo
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Define o esquema do post
const PostSchema = new mongoose.Schema({
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    conteudo: { type: String, required: true },
    curtidas: { type: Number, default: 0 },
    comentarios: [{ 
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        texto: { type: String, required: true }
    }]
});
const Post = mongoose.model('Post', PostSchema);

// Rota de registro
app.post('/registrar', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos!' });
        }
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: 'Email já cadastrado!' });
        }
        const senhaHash = await bcrypt.hash(senha, 10);
        const novoUsuario = new Usuario({ nome, email, senha: senhaHash });
        await novoUsuario.save();
        res.json({ success: true, message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// Rota de login
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(401).json({ success: false, message: 'Email não encontrado!' });
        }
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Senha incorreta!' });
        }
        res.json({ success: true, message: 'Login bem-sucedido!', usuarioId: usuario._id, nome: usuario.nome, biografia: usuario.biografia, corFundo: usuario.corFundo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// Rota para criar um post
app.post('/posts', async (req, res) => {
    try {
        const { autor, conteudo } = req.body;
        if (!autor || !conteudo) {
            return res.status(400).json({ success: false, message: 'Autor e conteúdo são obrigatórios!' });
        }
        const novoPost = new Post({ autor, conteudo });
        await novoPost.save();
        res.json({ success: true, message: 'Post criado com sucesso!', post: novoPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao criar post' });
    }
});

// Rota para buscar todos os posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().populate('autor', 'nome').populate('comentarios.usuario', 'nome');
        const postsComAutor = posts.map(post => ({
            ...post.toObject(),
            autor: post.autor ? post.autor : { nome: 'Autor desconhecido' } // Adiciona um valor padrão
        }));
        res.json({ success: true, posts: postsComAutor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao buscar posts' });
    }
});

// Rota para buscar posts de um usuário específico
app.get('/posts/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ autor: id }).populate('autor', 'nome');
        res.json({ success: true, posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao buscar posts do usuário' });
    }
});

// Rota para deletar um post
app.delete('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado!' });
        }
        await Post.findByIdAndDelete(id);
        res.json({ success: true, message: 'Post deletado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao deletar post' });
    }
});

// Rota para atualizar a biografia e a cor de fundo do usuário
app.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { biografia, corFundo } = req.body;
        await Usuario.findByIdAndUpdate(id, { biografia, corFundo });
        res.json({ success: true, message: 'Perfil atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
    }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
