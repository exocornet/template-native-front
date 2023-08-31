const paths = require('./webpack-config/paths');
const namePages = require('./src/app/list-pages/namePages').names;
const incrementalPagesWatch = require('./webpack-config/incremental-pages-watch');
const fs = require('fs');
const path = require('path');
const PugLintPlugin = require('puglint-webpack-plugin');
const StylelintWebpackPlugin = require('stylelint-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const magicImporter = require('node-sass-magic-importer');
const TerserPlugin = require('terser-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const PugPlugin = require('pug-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'watch';
let plugins = [];
let links = [];
let listPages = {};
const optionsMinimizer = [
	new TerserPlugin({
		test: /\.js(\?.*)?$/i,
		terserOptions: {
			format: {
				comments: false,
			},
		},
		extractComments: false,
		parallel: true,
	}),
	new ImageMinimizerPlugin({
		minimizer: {
			implementation: ImageMinimizerPlugin.imageminMinify,
			options: {
				plugins: [
					['gifsicle', { interlaced: true }],
					['mozjpeg', { quality: 85 }],
					['pngquant', { optimizationLevel: 6 }],
					[
						'svgo',
						{
							plugins: [
								{
									name: 'preset-default',
									params: {
										overrides: {
											removeViewBox: false,
											addAttributesToSVGElement: {
												params: {
													attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
												},
											},
										},
									},
								},
							],
						},
					],
				],
			},
		},
	}),
];

const arrPages = process.env.NODE_ENV === 'watch' ? incrementalPagesWatch : fs.readdirSync(`${paths.src}/pages/`);
arrPages.forEach((dirPage) => {
	let arrPage = [];
	if (path.extname(dirPage) === '') {
		arrPage = fs.readdirSync(`${paths.src}/pages/${dirPage}/`);
	}

	arrPage.forEach((page) => {
		if (path.extname(page) === '.pug') {
			// Преобразование страниц pug в html
			listPages = Object.assign({ ...listPages }, { [`${dirPage}`]: `src/pages/${dirPage}/${page}` });

			// Создание объекта с данными страниц
			links.push({
				link: `./${dirPage}.html`,
				title: dirPage,
				name: `${namePages(page)}`,
			});
		}
	});
});

plugins.push(
	new CopyWebpackPlugin({
		patterns: [
			{
				from: 'src/app/public',
				to: './public',
			},
		],
	})
);

plugins.push(
	new PugPlugin({
		pretty: true,
		js: {
			filename: 'assets/js/[name].js',
		},
		css: {
			filename: 'assets/css/[name].css',
		},
	}),
	new PugLintPlugin({
		context: 'src',
		files: '**/*.pug',
		config: Object.assign({ emitError: true }, require('./.pug-lintrc.json')),
	}),
	new StylelintWebpackPlugin({
		configFile: '.stylelintrc.json',
		context: 'src',
		files: '**/*.scss',
		failOnError: false,
		quiet: false,
	}),
	new ESLintPlugin({
		context: 'src',
		extensions: 'js',
		fix: true,
		failOnError: false,
		quiet: true,
	})
);

module.exports = {
	cache: isDev ? { type: 'memory' } : false,
	mode: isDev ? 'development' : 'production',
	entry: {
		'list-pages': 'src/app/list-pages/list-pages.pug',
		...listPages,
	},
	output: {
		path: `${paths.build}`,
		publicPath: isDev ? '/' : './',
		clean: true,
	},
	resolve: {
		extensions: ['.js', '.tsx', '.ts'],
		alias: {
			IMAGES: `${paths.images}`,
			FONTS: `${paths.fonts}`,
		},
	},
	stats: {
		children: true,
		errorDetails: true,
		loggingDebug: ['sass-loader'],
	},
	devtool: isDev ? 'inline-source-map' : false,
	devServer: {
		static: './build',
		client: {
			progress: true,
			overlay: {
				errors: true,
				warnings: false,
			},
		},
		historyApiFallback: true,
		open: 'list-pages.html',
		compress: true,
		hot: true,
		port: 8080,
		watchFiles: 'src/**/*',
	},
	module: {
		rules: [
			{
				test: /\.pug$/,
				oneOf: [
					{
						issuer: /\.(js|ts)$/,
						loader: PugPlugin.loader,
						options: {
							method: 'compile',
							esModule: true,
						},
					},
					// render Pug from Webpack entry into static HTML
					{
						loader: PugPlugin.loader,
						options: {
							method: 'compile',
							data: {
								listLinks: links,
								jsPath: isDev ? './assets/js' : './assets/js',
								cssPath: isDev ? './assets/css' : './assets/css',
								media: {
									xs: '575px',
									sm: '767px',
									md: '991px',
									lg: '1199px',
									l: '1399px',
								},
							},
							embedFilters: {
								escape: true,
							},
						},
					},
				],
			},
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: ['babel-loader'],
			},
			{
				test: /\.(jpe?g|png|gif|svg|webp)$/i,
				type: 'asset/resource',
				exclude: /fonts/,
				generator: {
					filename: 'assets/img/[name][ext]',
				},
			},
			{
				test: /\.(woff(2)?|eot|ttf|otf|svg)$/,
				exclude: /img/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/fonts/[name][ext]',
				},
			},
			{
				test: /\.(s[ac]ss|css)$/i,
				use: [
					{
						loader: 'css-loader',
						options: {
							sourceMap: isDev,
						},
					},
					{
						loader: 'postcss-loader',
						options: {
							sourceMap: isDev,
						},
					},
					{
						loader: 'sass-loader',
						options: {
							sassOptions: {
								importer: magicImporter(),
							},
							sourceMap: isDev,
						},
					},
				],
			},
		],
	},
	optimization: {
		minimize: !isDev,
		minimizer: !isDev ? optionsMinimizer : [],
	},
	plugins: plugins,
};
