package com.jsmartservices.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.jsmartservices.app.databinding.ActivityMainBinding
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    
    // URL Principal de Produção no Cloudflare Worker (Backend Unificado)
    private val appUrl = "https://j-smart-services-app.jfigueiredo790.workers.dev"

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null
    private var backPressedTime: Long = 0

    // Launchers de Permissões e Seleção de Ficheiros / Câmara
    private lateinit var filePickerLauncher: ActivityResultLauncher<Intent>
    private lateinit var cameraPermissionLauncher: ActivityResultLauncher<String>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupLaunchers()
        setupWebView()
        setupSwipeRefresh()
        setupRetryButton()
        setupBackNavigation()

        loadPlatform()
    }

    private fun setupLaunchers() {
        filePickerLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK) {
                val data = result.data
                val results: Array<Uri>? = when {
                    data?.clipData != null -> {
                        val count = data.clipData!!.itemCount
                        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                    }
                    data?.data != null -> arrayOf(data.data!!)
                    cameraImageUri != null -> arrayOf(cameraImageUri!!)
                    else -> null
                }
                filePathCallback?.onReceiveValue(results)
            } else {
                filePathCallback?.onReceiveValue(null)
            }
            filePathCallback = null
        }

        cameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (!isGranted) {
                Toast.makeText(this, "Permissão de câmara necessária para fotos", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView
        val settings = webView.settings

        // 1. Recursos essenciais para SPA React + Vite
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadsImagesAutomatically = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false

        // 2. Cache e Desempenho
        settings.cacheMode = if (isNetworkAvailable()) WebSettings.LOAD_DEFAULT else WebSettings.LOAD_CACHE_ELSE_NETWORK

        // 3. User-Agent customizado para identificar a App Android
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent JSmartServicesAndroidApp/1.0.0 (Android; Angola)"

        // 4. Cookies e Sessão de Utilizador Persistente
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // 5. Interface JavaScript para chamadas nativas
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidNative")

        // 6. Configuração do WebViewClient
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                binding.progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.progressBar.visibility = View.GONE
                binding.swipeRefreshLayout.isRefreshing = false

                // Esconder Splash Inicial após o primeiro carregamento bem-sucedido
                if (binding.splashContainer.visibility == View.VISIBLE) {
                    binding.splashContainer.animate()
                        .alpha(0f)
                        .setDuration(350)
                        .withEndAction {
                            binding.splashContainer.visibility = View.GONE
                        }
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    showOfflineErrorView()
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleExternalUrls(url)
            }
        }

        // 7. Configuração do WebChromeClient (Barra de progresso e Upload de Ficheiros / Câmara)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.progressBar.progress = newProgress
                if (newProgress == 100) {
                    binding.progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                openFileChooserIntent(fileChooserParams)
                return true
            }
        }
    }

    private fun handleExternalUrls(url: String): Boolean {
        // Redirecionar esquemas nativos: WhatsApp, Telefone, Email, Maps
        if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") ||
            url.startsWith("whatsapp:") || url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
                return true
            } catch (e: ActivityNotFoundException) {
                Toast.makeText(this, "Nenhuma aplicação compatível encontrada", Toast.LENGTH_SHORT).show()
                return true
            }
        }

        // Manter navegação interna dentro do Cloudflare Worker
        if (url.contains("workers.dev") || url.contains("jsmartservices")) {
            return false
        }

        // Links externos abrem no browser padrão do sistema
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun openFileChooserIntent(fileChooserParams: WebChromeClient.FileChooserParams?) {
        val acceptTypes = fileChooserParams?.acceptTypes ?: arrayOf("image/*")
        val isImageOnly = acceptTypes.any { it.contains("image") } || acceptTypes.isEmpty()

        val chooserIntents = mutableListOf<Intent>()

        // Opção de tirar fotografia na hora se for para imagem
        if (isImageOnly) {
            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            if (takePictureIntent.resolveActivity(packageManager) != null) {
                try {
                    val photoFile = createImageFile()
                    val photoURI = FileProvider.getUriForFile(
                        this,
                        "${applicationContext.packageName}.fileprovider",
                        photoFile
                    )
                    cameraImageUri = photoURI
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI)
                    chooserIntents.add(takePictureIntent)
                } catch (ex: IOException) {
                    ex.printStackTrace()
                }
            }
        }

        // Intent de Galeria / Ficheiros
        val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (isImageOnly) "image/*" else "*/*"
            if (fileChooserParams?.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            }
        }

        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
            putExtra(Intent.EXTRA_TITLE, "Selecionar Ficheiro ou Foto")
            if (chooserIntents.isNotEmpty()) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, chooserIntents.toTypedArray())
            }
        }

        filePickerLauncher.launch(chooserIntent)
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir: File? = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("JPEG_${timeStamp}_", ".jpg", storageDir)
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.primary_emerald)
        )
        binding.swipeRefreshLayout.setOnRefreshListener {
            if (isNetworkAvailable()) {
                binding.offlineErrorView.visibility = View.GONE
                binding.webView.visibility = View.VISIBLE
                binding.webView.reload()
            } else {
                binding.swipeRefreshLayout.isRefreshing = false
                showOfflineErrorView()
            }
        }

        // Evitar conflito de scroll vertical na WebView
        binding.webView.viewTreeObserver.addOnScrollChangedListener {
            binding.swipeRefreshLayout.isEnabled = (binding.webView.scrollY == 0)
        }
    }

    private fun setupRetryButton() {
        binding.btnRetry.setOnClickListener {
            loadPlatform()
        }
    }

    private fun loadPlatform() {
        if (isNetworkAvailable()) {
            binding.offlineErrorView.visibility = View.GONE
            binding.webView.visibility = View.VISIBLE
            binding.webView.loadUrl(appUrl)
        } else {
            showOfflineErrorView()
        }
    }

    private fun showOfflineErrorView() {
        binding.progressBar.visibility = View.GONE
        binding.splashContainer.visibility = View.GONE
        binding.swipeRefreshLayout.isRefreshing = false
        binding.webView.visibility = View.GONE
        binding.offlineErrorView.visibility = View.VISIBLE
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.offlineErrorView.visibility == View.VISIBLE) {
                    finish()
                    return
                }

                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    // Duplo clique para sair da aplicação com segurança
                    if (backPressedTime + 2000 > System.currentTimeMillis()) {
                        finish()
                    } else {
                        Toast.makeText(
                            this@MainActivity,
                            "Toque novamente no botão Voltar para sair",
                            Toast.LENGTH_SHORT
                        ).show()
                        backPressedTime = System.currentTimeMillis()
                    }
                }
            }
        })
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    override fun onDestroy() {
        binding.webView.destroy()
        super.onDestroy()
    }
}
